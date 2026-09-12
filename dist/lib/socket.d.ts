import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { Role } from "@prisma/client";
export declare const initSocket: (httpServer: HttpServer) => Server;
export declare const getIO: () => Server;
export declare const getOnlineCount: () => number;
/**
 * Broadcast role-filtered live activity feed
 * - Admin sees activity across all projects
 * - PM sees activity only from their own projects
 * - Developer sees activity only on tasks assigned to them
 */
export declare const broadcastActivity: (activity: {
    id: string;
    taskId?: string | null;
    projectId: string;
    action: string;
    details: string;
    createdAt: Date;
    user: {
        id: string;
        name: string;
        email: string;
        role: Role;
    };
    projectPmId: string;
    taskAssigneeId?: string | null;
}) => void;
/**
 * Broadcast task status update to all users viewing the project
 */
export declare const broadcastTaskUpdate: (projectId: string, task: any) => void;
/**
 * Emit real-time notification to specific user
 */
export declare const emitNotification: (userId: string, notification: any) => Promise<void>;
//# sourceMappingURL=socket.d.ts.map