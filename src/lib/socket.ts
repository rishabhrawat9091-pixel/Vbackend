import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "./prisma.js";
import { Role } from "@prisma/client";

interface SocketUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

let io: Server | null = null;

// Track active users: userId -> Set of socket IDs
const activeUsers = new Map<string, Set<string>>();

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5173"],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error("JWT_SECRET is not configured"));
      }

      const decoded = jwt.verify(token, secret) as { userId: string };
      if (!decoded?.userId) {
        return next(new Error("Invalid token payload"));
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true, role: true },
      });

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.data.user = user;
      next();
    } catch (err) {
      next(new Error("Socket authentication failed"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user: SocketUser = socket.data.user;
    if (!user) return;

    // Register user presence
    if (!activeUsers.has(user.id)) {
      activeUsers.set(user.id, new Set());
    }
    activeUsers.get(user.id)!.add(socket.id);

    // Join personal user room
    socket.join(`user:${user.id}`);

    // Join role room
    socket.join(`role:${user.role}`);

    console.log(`🔌 [WebSocket] Connected: ${user.name} (${user.role}) - Total online: ${activeUsers.size}`);

    // Broadcast updated presence to Admin room
    emitPresenceCount();

    // Client requests current online count
    socket.on("presence:get", () => {
      socket.emit("presence:count", { onlineUsers: activeUsers.size });
    });

    // Handle project view room join/leave
    socket.on("project:join", ({ projectId }: { projectId: string }) => {
      if (projectId) {
        socket.join(`project:${projectId}`);
      }
    });

    socket.on("project:leave", ({ projectId }: { projectId: string }) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });

    socket.on("disconnect", () => {
      const userSockets = activeUsers.get(user.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeUsers.delete(user.id);
        }
      }
      console.log(`🔌 [WebSocket] Disconnected: ${user.name} - Total online: ${activeUsers.size}`);
      emitPresenceCount();
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io has not been initialized!");
  }
  return io;
};

export const getOnlineCount = (): number => {
  return activeUsers.size;
};

const emitPresenceCount = () => {
  if (!io) return;
  io.to("role:ADMIN").emit("presence:count", { onlineUsers: activeUsers.size });
};

/**
 * Broadcast role-filtered live activity feed
 * - Admin sees activity across all projects
 * - PM sees activity only from their own projects
 * - Developer sees activity only on tasks assigned to them
 */
export const broadcastActivity = (activity: {
  id: string;
  taskId?: string | null;
  projectId: string;
  action: string;
  details: string;
  createdAt: Date;
  user: { id: string; name: string; email: string; role: Role };
  projectPmId: string;
  taskAssigneeId?: string | null;
}) => {
  if (!io) return;

  const payload = {
    id: activity.id,
    taskId: activity.taskId,
    projectId: activity.projectId,
    action: activity.action,
    details: activity.details,
    createdAt: activity.createdAt,
    user: activity.user,
  };

  // 1. Admin sees everything
  io.to("role:ADMIN").emit("activity:new", payload);

  // 2. Project Manager sees their own project activity
  if (activity.projectPmId) {
    io.to(`user:${activity.projectPmId}`).emit("activity:new", payload);
  }

  // 3. Developer sees only if assigned to this task
  if (activity.taskAssigneeId) {
    io.to(`user:${activity.taskAssigneeId}`).emit("activity:new", payload);
  }
};

/**
 * Broadcast task status update to all users viewing the project
 */
export const broadcastTaskUpdate = (projectId: string, task: any) => {
  if (!io) return;
  // Send to all users currently viewing the project
  io.to(`project:${projectId}`).emit("task:updated", task);
  // Also send to global admin and assigned developer if not currently inside the project page
  io.to("role:ADMIN").emit("task:updated", task);
  if (task.assignedToId) {
    io.to(`user:${task.assignedToId}`).emit("task:updated", task);
  }
};

/**
 * Emit real-time notification to specific user
 */
export const emitNotification = async (userId: string, notification: any) => {
  if (!io) return;

  // Calculate unread count
  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  io.to(`user:${userId}`).emit("notification:new", {
    notification,
    unreadCount,
  });

  io.to(`user:${userId}`).emit("notification:count", { unreadCount });
};
