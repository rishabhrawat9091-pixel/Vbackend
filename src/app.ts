import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRouter from "./router/auth.js";
import projectRouter from "./router/project.js";
import taskRouter from "./router/task.js";
import clientRouter from "./router/client.js";
import activityRouter from "./router/activity.js";
import notificationRouter from "./router/notification.js";
import dashboardRouter from "./router/dashboard.js";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Server is healthy and running",
    timestamp: new Date().toISOString(),
  });
});

// Mount API Routers
app.use("/api/auth", authRouter);
app.use("/api", authRouter); // Backward compatibility for /api/login, /api/register
app.use("/api/projects", projectRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/clients", clientRouter);
app.use("/api/activity", activityRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/dashboard", dashboardRouter);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "The requested endpoint does not exist",
    },
  });
});

// Global Error Handler - No raw stack traces exposed to client!
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled Global Error:", err);

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected internal server error occurred",
    },
  });
});

export default app;