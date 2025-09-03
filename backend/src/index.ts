import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import logger, { morganStream } from "./services/logger";
import { HealthCheckService } from "./services/healthCheck";
import { DatabaseConnection } from "./utils/databaseConnection";
import { initializeImprovedLogging } from "./config/improvedLogging";
import { gracefulShutdown } from "./services/gracefulShutdown";

// Load environment variables
dotenv.config();

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

// Initialize logging configuration first
initializeImprovedLogging();

// Enable verbose logging in development, quiet in production
const isDevelopment =
  process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
if (!isDevelopment) {
  // Disable verbose logging in production
  process.env.DISABLE_HTTP_LOGGING = "true";
  process.env.DISABLE_STARTUP_OPTIMIZATION = "true";

  // Override console methods to reduce noise in production
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;

  console.log = (...args) => {
    const message = args.join(" ");
    if (
      message.includes("🎯") ||
      message.includes("ready") ||
      message.includes("Error")
    ) {
      originalLog(...args);
    }
  };

  console.info = (...args) => {
    const message = args.join(" ");
    if (
      message.includes("🎯") ||
      message.includes("ready") ||
      message.includes("Error")
    ) {
      originalInfo(...args);
    }
  };

  console.warn = (...args) => {
    const message = args.join(" ");
    if (message.includes("Error") || message.includes("error")) {
      originalWarn(...args);
    }
  };
}

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "https://worrybox.gigaelk.com",
      "http://localhost:3000",
      "http://localhost:5173", // Vite dev server
    ],
    credentials: true,
  })
);

// HTTP request logging - only in development
if (isDevelopment && process.env.DISABLE_HTTP_LOGGING !== "true") {
  app.use(morgan("combined", { stream: morganStream }));
}

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Initialize services only when needed
let platformAdapter: any;
let healthCheckService: any;

const initializeServices = async () => {
  if (!platformAdapter) {
    const { PlatformAdapterService } = await import(
      "./services/platformAdapter"
    );
    platformAdapter = PlatformAdapterService.getInstance();
  }

  if (!healthCheckService) {
    healthCheckService = HealthCheckService.getInstance();
  }
};

// Essential health check endpoints
app.get("/health", async (req, res) => {
  try {
    await initializeServices();
    const isHealthy = await healthCheckService.isHealthy();
    res.status(isHealthy ? 200 : 503).send(isHealthy ? "OK" : "UNHEALTHY");
  } catch (error) {
    res.status(503).send("UNHEALTHY");
  }
});

app.get("/api/health", async (req, res) => {
  // Simple, reliable health check for resource-constrained environments
  res.status(200).json({ status: "ok" });
});

// Database wake-up endpoint
app.get("/api/wake", async (req, res) => {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();

    res.json({
      status: "awake",
      message: "Database connection established",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Database wake-up failed", error);
    res.status(503).json({
      status: "sleeping",
      message: "Database connection failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Platform information endpoint
app.get("/api/platform", async (req, res) => {
  try {
    await initializeServices();
    const platform = platformAdapter.getPlatform();
    const config = platformAdapter.getConfig();

    res.json({
      platform,
      config,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Platform endpoint error", error);
    res.status(500).json({
      error: "Failed to retrieve platform information",
      timestamp: new Date().toISOString(),
    });
  }
});

// Import and setup routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import postRoutes from "./routes/posts";
import followRoutes from "./routes/follows";
import likeRoutes from "./routes/likes";
import meTooRoutes from "./routes/metoo";
import profilePictureRoutes from "./routes/profilePicture";
import commentRoutes from "./routes/comments";
import schedulingRoutes from "./routes/scheduling";
import moderationRoutes from "./routes/moderation";
import worryAnalysisRoutes from "./routes/worryAnalysis";
import subscriptionRoutes from "./routes/subscriptions";
import analyticsRoutes from "./routes/analytics";
import demographicAnalyticsRoutes from "./routes/demographicAnalytics";
import worryResolutionRoutes from "./routes/worryResolution";
import notificationsRoutes from "./routes/notifications";
import languagesRoutes from "./routes/languages";
import dashboardRoutes from "./routes/dashboard";
import statusRoutes from "./routes/status";
import wellnessRoutes from "./routes/wellness";
import adminRoutes from "./routes/admin";
import monitoringRoutes from "./routes/monitoring";

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/follows", followRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/metoo", meTooRoutes);
app.use("/api/profile-picture", profilePictureRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/scheduling", schedulingRoutes);
app.use("/api/moderation", moderationRoutes);
app.use("/api/analysis", worryAnalysisRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/demographics", demographicAnalyticsRoutes);
app.use("/api/resolutions", worryResolutionRoutes);
app.use("/api/wellness", wellnessRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/languages", languagesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/monitoring", monitoringRoutes);

// Development error testing endpoints
if (isDevelopment) {
  try {
    const monitoringTestRoutes = require("./routes/monitoringTest").default;
    app.use("/api/test", monitoringTestRoutes);
  } catch (error) {
    // Ignore if monitoring test routes don't exist
  }
}

// Catch-all for undefined routes
app.use("/api", (req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "API endpoint not found",
    },
  });
});

// Global error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    // Handle JSON parsing errors specifically
    if (err instanceof SyntaxError && err.message.includes("JSON")) {
      logger.error("JSON parsing error", err);
      return res.status(400).json({
        error: {
          code: "INVALID_JSON",
          message: "Invalid JSON format in request body",
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }

    // Log the error
    logger.error("Unhandled error", err);

    // Send generic error response
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An internal server error occurred",
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }
);

// Start server with simplified startup
const server = app.listen(PORT, async () => {
  try {
    // Initialize essential services
    await initializeServices();

    // Initialize schedulers in the background (non-blocking)
    if (!isDevelopment) {
      setImmediate(async () => {
        try {
          const { SchedulingService } = await import(
            "./services/schedulingService"
          );
          const { NotificationScheduler } = await import(
            "./services/notificationScheduler"
          );
          const { AIReprocessingService } = await import(
            "./services/aiReprocessingService"
          );

          const schedulingService = SchedulingService.getInstance();
          const notificationScheduler = NotificationScheduler.getInstance();
          const aiReprocessingService = AIReprocessingService.getInstance();

          schedulingService.startScheduler();
          notificationScheduler.startScheduler();
          aiReprocessingService.startScheduler();

          if (isDevelopment) {
            logger.info("📅 Schedulers started successfully");
          }
        } catch (error) {
          logger.error("Failed to start schedulers", error);
        }
      });
    }

    // Initialize graceful shutdown
    gracefulShutdown.initialize(server);

    // Simple ready message
    console.log(`🎯 Worrybox API server ready and running on port ${PORT}`);

    if (isDevelopment) {
      logger.info("🎯 Worrybox API server ready and running", {
        port: PORT,
        platform: platformAdapter?.getPlatform() || "unknown",
        uptime: process.uptime(),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      });
    }
  } catch (error) {
    logger.error("Server startup failed", error);
    process.exit(1);
  }
});
