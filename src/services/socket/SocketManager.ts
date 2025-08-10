import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../../repositories/UserRepository';
import { EventBus } from '../../core/events/EventBus';
import { Logger } from '../../utils/Logger';
import { config } from '../../config/environment';
import { NotificationEvents } from '@/types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

export class SocketManager {
  private io: SocketIOServer;
  private userSockets: Map<string, Set<string>> = new Map();
  private socketUsers: Map<string, string> = new Map();
  private userRepo: UserRepository;
  private eventBus: EventBus;
  private logger: Logger;

  constructor(server: http.Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.userRepo = new UserRepository();
    this.eventBus = new EventBus();
    this.logger = Logger.getInstance();

    this.setupEventHandlers();
    this.setupNotificationListeners();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.logger.info(`Socket connected: ${socket.id}`);

      socket.on('authenticate', async (data: { token: string }) => {
        try {
          const user = await this.authenticateSocket(data.token);
          socket.userId = user.id;
          socket.userEmail = user.email;

          // Update user's last login
          await this.userRepo.updateLastLogin(user.id);

          // Add socket to user mapping
          this.addUserSocket(user.id, socket.id);

          // Join user-specific room
          socket.join(`user_${user.id}`);
          
          // Send authentication success
          socket.emit('authenticated', { 
            userId: user.id,
            email: user.email,
            timestamp: new Date()
          });

          this.logger.info(`Socket authenticated: ${socket.id} for user: ${user.id}`);

        } catch (error) {
          socket.emit('authentication_failed', { 
            error: (error as Error).message 
          });
          socket.disconnect(true);
          this.logger.warn(`Socket authentication failed: ${socket.id}`);
        }
      });

      socket.on('subscribe_notifications', () => {
        if (socket.userId) {
          socket.join(`notifications_${socket.userId}`);
          socket.emit('subscribed', { type: 'notifications' });
          this.logger.info(`Socket subscribed to notifications: ${socket.id}`);
        }
      });

      socket.on('unsubscribe_notifications', () => {
        if (socket.userId) {
          socket.leave(`notifications_${socket.userId}`);
          socket.emit('unsubscribed', { type: 'notifications' });
          this.logger.info(`Socket unsubscribed from notifications: ${socket.id}`);
        }
      });

      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });

      socket.on('disconnect', (reason) => {
        if (socket.userId) {
          this.removeUserSocket(socket.userId, socket.id);
          this.logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);
        }
      });

      socket.on('error', (error) => {
        this.logger.error(`Socket error: ${socket.id}`, error);
      });
    });

    // Handle server-level events
    this.io.engine.on('connection_error', (err) => {
      this.logger.error('Socket.IO connection error', err);
    });
  }

  private setupNotificationListeners(): void {
    // Listen for notification events
    this.eventBus.subscribe(NotificationEvents.NOTIFICATION_SENT, (data) => {
      this.handleNotificationSent(data);
    });

    this.eventBus.subscribe(NotificationEvents.NOTIFICATION_DELIVERED, (data) => {
      this.handleNotificationDelivered(data);
    });

    this.eventBus.subscribe(NotificationEvents.NOTIFICATION_FAILED, (data) => {
      this.handleNotificationFailed(data);
    });
  }

  private async authenticateSocket(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      const user = await this.userRepo.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new Error('Invalid or inactive user');
      }

      return user;
    } catch (error) {
      throw new Error('Authentication failed');
    }
  }

  async sendToUser(userId: string, event: string, data: any): Promise<any> {
    try {
      const sent = this.io.to(`user_${userId}`).emit(event, {
        ...data,
        timestamp: new Date()
      });

      const connectionCount = this.getUserConnectionCount(userId);
      this.logger.info(`Sent event to user: ${userId}`, { 
        event, 
        connectionCount,
        data: typeof data === 'object' ? Object.keys(data) : data
      });

      return sent;
    } catch (error) {
      this.logger.error(`Failed to send event to user: ${userId}`, error as Error);
    }
  }

  async sendToRoom(room: string, event: string, data: any): Promise<void> {
    try {
      this.io.to(room).emit(event, {
        ...data,
        timestamp: new Date()
      });

      this.logger.info(`Sent event to room: ${room}`, { event });
    } catch (error) {
      this.logger.error(`Failed to send event to room: ${room}`, error as Error);
    }
  }

  async broadcastToAll(event: string, data: any): Promise<void> {
    try {
      this.io.emit(event, {
        ...data,
        timestamp: new Date()
      });

      this.logger.info(`Broadcasted event to all users`, { event });
    } catch (error) {
      this.logger.error(`Failed to broadcast event`, error as Error);
    }
  }

  getUserConnectionCount(userId: string): number {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size : 0;
  }

  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  getTotalConnections(): number {
    return this.io.sockets.sockets.size;
  }

  getConnectionStats(): {
    totalConnections: number;
    authenticatedUsers: number;
    averageConnectionsPerUser: number;
  } {
    const totalConnections = this.getTotalConnections();
    const authenticatedUsers = this.userSockets.size;
    const averageConnectionsPerUser = authenticatedUsers > 0 
      ? Math.round((totalConnections / authenticatedUsers) * 100) / 100 
      : 0;

    return {
      totalConnections,
      authenticatedUsers,
      averageConnectionsPerUser
    };
  }

  private addUserSocket(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
    this.socketUsers.set(socketId, userId);
  }

  private removeUserSocket(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.socketUsers.delete(socketId);
  }

  private async handleNotificationSent(data: any): Promise<void> {
    const { notificationId } = data;
    // In a real implementation, you would fetch the notification
    // and send real-time update to the user
    this.logger.info(`Handling notification sent event: ${notificationId}`);
  }

  private async handleNotificationDelivered(data: any): Promise<void> {
    const { notificationId } = data;
    this.logger.info(`Handling notification delivered event: ${notificationId}`);
  }

  private async handleNotificationFailed(data: any): Promise<void> {
    const { notificationId, error } = data;
    this.logger.info(`Handling notification failed event: ${notificationId}`, { error });
  }
}
