import express, { query } from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { Logger } from "./utils/Logger";
import { config } from "./config/environment";

class NotificationApp {
  private app: express.Application;
  private server: http.Server;
  private logger: Logger;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.logger = Logger.getInstance();

    this.setUpMiddleware();
  }

  private setUpMiddleware(): void {
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
      })
    );
    this.app.use(compression());
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    this.app.use((req, res, next) => {
      this.logger.http(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        query: req.query,
        body: req.body,
      });
      next();
    });
  }

  async start(): Promise<void> {
    try {
      this.logger.info("Connected to Redis");

      // Start server
      this.server.listen(config.port, () => {
        this.logger.info(`Server running on port ${config.port}`);
        this.logger.info(`Environment: ${config.nodeEnv}`);
      });
    } catch (error) {
      this.logger.error("Failed to start server", error as Error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info("Shutting down server...");

    // Close server
    this.server.close(() => {
      this.logger.info("HTTP server closed");
    });

    this.logger.info("Server shutdown complete");
    process.exit(0);
  }
}

const app = new NotificationApp();

app.start().catch((error) => {
  console.error("Error starting application", error);
  process.exit(1);
});

export default app;