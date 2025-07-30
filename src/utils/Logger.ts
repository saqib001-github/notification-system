import winston from "winston";
import { config } from "../config/environment";

export class Logger {
  private static instance: Logger;
  private winston: winston.Logger;

  private constructor() {
    this.winston = winston.createLogger({
      level: config.nodeEnv === "production" ? "info" : "debug",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: "notification-system",
        nodeId: process.env.NODE_ID || "unknown",
      },
      transports: [
        new winston.transports.File({
          filename: "logs/error.log",
          level: "error",
          maxsize: 5242880,
          maxFiles: 5,
        }),
      ],
    });

    if (config.nodeEnv !== "production") {
      this.winston.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        })
      );
    }
  }

  public static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  info(message: string, meta?: any): void {
    this.winston.info(message, meta);
  }
  error(message: string, error?: Error): void {
    this.winston.error(message, {
      error: error?.message,
      stack: error?.stack,
    });
  }
  warn(message: string, meta?: any): void {
    this.winston.warn(message, meta);
  }
  debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
  }
  http(message: string, meta?: any): void {
    this.winston.http(message, meta);
  }
}
