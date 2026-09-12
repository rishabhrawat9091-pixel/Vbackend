import prisma from "../lib/prisma.js";
import { Role, TaskStatus, TaskPriority } from "@prisma/client";
import { z } from "zod";
import { broadcastActivity, broadcastTaskUpdate, emitNotification, } from "../lib/socket.js";
/* =========================================================
   ZOD VALIDATION SCHEMAS
========================================================= */
export const createTaskSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters"),
    description: z.string().optional(),
    status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.TODO),
    priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
    dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid due date format",
    }),
    projectId: z.string().min(1, "projectId is required"),
    assignedToId: z.string().min(1, "assignedToId is required"),
});
export const updateTaskStatusSchema = z.object({
    status: z.nativeEnum(TaskStatus),
});
export const updateTaskSchema = z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    dueDate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid due date" })
        .optional(),
    assignedToId: z.string().optional(),
});
const formatStatus = (s) => {
    switch (s) {
        case TaskStatus.TODO:
            return "To Do";
        case TaskStatus.IN_PROGRESS:
            return "In Progress";
        case TaskStatus.IN_REVIEW:
            return "In Review";
        case TaskStatus.DONE:
            return "Done";
        default:
            return s;
    }
};
/* =========================================================
   CREATE TASK (Admin or PM)
========================================================= */
export const createTask = async (req, res) => {
    try {
        const { title, description, status, priority, dueDate, projectId, assignedToId, } = req.body;
        const parsedDueDate = new Date(dueDate);
        // Verify Project
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                projectManager: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        if (!project) {
            res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Project not found" },
            });
            return;
        }
        // PM can only create tasks in their own projects
        if (req.userRole === Role.PROJECT_MANAGER &&
            project.projectManagerId !== req.userId) {
            res.status(403).json({
                success: false,
                error: {
                    code: "FORBIDDEN",
                    message: "You are not allowed to create tasks in this project",
                },
            });
            return;
        }
        // Verify Assigned Developer
        const developer = await prisma.user.findUnique({
            where: { id: assignedToId },
            select: { id: true, name: true, email: true, role: true },
        });
        if (!developer) {
            res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Assigned user not found" },
            });
            return;
        }
        if (developer.role !== Role.DEVELOPER) {
            res.status(400).json({
                success: false,
                error: {
                    code: "INVALID_ASSIGNMENT",
                    message: "Tasks can only be assigned to a user with DEVELOPER role",
                },
            });
            return;
        }
        const isOverdue = parsedDueDate < new Date() && status !== TaskStatus.DONE;
        const task = await prisma.task.create({
            data: {
                title: title.trim(),
                description: description ? description.trim() : null,
                status: status || TaskStatus.TODO,
                priority: priority || TaskPriority.MEDIUM,
                dueDate: parsedDueDate,
                isOverdue,
                projectId: projectId,
                assignedToId: assignedToId,
            },
            include: {
                project: {
                    select: { id: true, name: true, projectManagerId: true },
                },
                assignedTo: {
                    select: { id: true, name: true, email: true, role: true },
                },
            },
        });
        // 1. Create Activity Log in DB
        const activityLog = await prisma.activityLog.create({
            data: {
                taskId: task.id,
                projectId: project.id,
                userId: req.userId,
                action: "TASK_CREATED",
                fromStatus: null,
                toStatus: task.status,
                details: `${req.userName || "A user"} created "${task.title}" and assigned to ${developer.name}`,
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true },
                },
            },
        });
        // 2. Notification to Developer (stored in DB)
        const notification = await prisma.notification.create({
            data: {
                userId: developer.id,
                title: "New Task Assigned",
                message: `You were assigned to "${task.title}" in ${project.name}`,
                type: "TASK_ASSIGNED",
                taskId: task.id,
                projectId: project.id,
            },
        });
        // 3. Real-Time WebSocket Dispatches
        await emitNotification(developer.id, notification);
        broadcastActivity({
            id: activityLog.id,
            taskId: task.id,
            projectId: project.id,
            action: activityLog.action,
            details: activityLog.details,
            createdAt: activityLog.createdAt,
            user: activityLog.user,
            projectPmId: project.projectManagerId,
            taskAssigneeId: developer.id,
        });
        broadcastTaskUpdate(project.id, task);
        res.status(201).json({
            success: true,
            message: "Task created successfully",
            task,
        });
    }
    catch (error) {
        console.error("Create Task Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to create task" },
        });
    }
};
/* =========================================================
   GET TASKS (Filters via Query Params: status, priority, due date range)
========================================================= */
export const getTasks = async (req, res) => {
    try {
        const { projectId, status, priority, fromDueDate, toDueDate, search, } = req.query;
        const where = {};
        // Strict Role-Based Data Isolation
        if (req.userRole === Role.ADMIN) {
            if (projectId)
                where.projectId = projectId;
        }
        else if (req.userRole === Role.PROJECT_MANAGER) {
            where.project = {
                projectManagerId: req.userId,
            };
            if (projectId) {
                where.projectId = projectId;
            }
        }
        else if (req.userRole === Role.DEVELOPER) {
            // Developer CANNOT see other developers' tasks!
            where.assignedToId = req.userId;
            if (projectId) {
                where.projectId = projectId;
            }
        }
        // Filter by Status
        if (status && Object.values(TaskStatus).includes(status)) {
            where.status = status;
        }
        // Filter by Priority
        if (priority &&
            Object.values(TaskPriority).includes(priority)) {
            where.priority = priority;
        }
        // Filter by Due Date Range
        if (fromDueDate || toDueDate) {
            where.dueDate = {};
            if (fromDueDate && !isNaN(Date.parse(fromDueDate))) {
                where.dueDate.gte = new Date(fromDueDate);
            }
            if (toDueDate && !isNaN(Date.parse(toDueDate))) {
                where.dueDate.lte = new Date(toDueDate);
            }
        }
        // Filter by Search Query
        if (search && search.trim()) {
            where.OR = [
                { title: { contains: search.trim(), mode: "insensitive" } },
                { description: { contains: search.trim(), mode: "insensitive" } },
            ];
        }
        const tasks = await prisma.task.findMany({
            where,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        projectManagerId: true,
                        client: { select: { id: true, name: true } },
                    },
                },
                assignedTo: {
                    select: { id: true, name: true, email: true, role: true },
                },
            },
            orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        });
        res.status(200).json({
            success: true,
            tasks,
        });
    }
    catch (error) {
        console.error("Get Tasks Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to retrieve tasks" },
        });
    }
};
/* =========================================================
   GET TASK BY ID (Strict role-based isolation)
========================================================= */
export const getTaskById = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        projectManagerId: true,
                        projectManager: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
                assignedTo: {
                    select: { id: true, name: true, email: true, role: true },
                },
                activityLogs: {
                    include: {
                        user: { select: { id: true, name: true, email: true, role: true } },
                    },
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        if (!task) {
            res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Task not found" },
            });
            return;
        }
        // Strict role check
        if (req.userRole === Role.PROJECT_MANAGER &&
            task.project.projectManagerId !== req.userId) {
            res.status(403).json({
                success: false,
                error: {
                    code: "FORBIDDEN",
                    message: "You cannot access tasks from another PM's project",
                },
            });
            return;
        }
        if (req.userRole === Role.DEVELOPER && task.assignedToId !== req.userId) {
            res.status(403).json({
                success: false,
                error: {
                    code: "FORBIDDEN",
                    message: "You cannot access tasks assigned to other developers",
                },
            });
            return;
        }
        res.status(200).json({
            success: true,
            task,
        });
    }
    catch (error) {
        console.error("Get Task By ID Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to fetch task" },
        });
    }
};
/* =========================================================
   UPDATE TASK STATUS (Core real-time workflow)
========================================================= */
export const updateTaskStatus = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const { status } = req.body;
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        projectManagerId: true,
                        projectManager: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
                assignedTo: {
                    select: { id: true, name: true, email: true, role: true },
                },
            },
        });
        if (!task) {
            res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Task not found" },
            });
            return;
        }
        // Permission check:
        // Developer can only update tasks assigned to them
        if (req.userRole === Role.DEVELOPER && task.assignedToId !== req.userId) {
            res.status(403).json({
                success: false,
                error: {
                    code: "FORBIDDEN",
                    message: "You can only update status for tasks assigned to you",
                },
            });
            return;
        }
        // PM can only update tasks in their own project
        if (req.userRole === Role.PROJECT_MANAGER &&
            task.project.projectManagerId !== req.userId) {
            res.status(403).json({
                success: false,
                error: {
                    code: "FORBIDDEN",
                    message: "You cannot modify tasks from another PM's project",
                },
            });
            return;
        }
        const previousStatus = task.status;
        if (previousStatus === status) {
            res.status(200).json({
                success: true,
                message: "Status unchanged",
                task,
            });
            return;
        }
        const isNowOverdue = status !== TaskStatus.DONE && new Date(task.dueDate) < new Date();
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                status,
                isOverdue: isNowOverdue,
            },
            include: {
                project: {
                    select: { id: true, name: true, projectManagerId: true },
                },
                assignedTo: {
                    select: { id: true, name: true, email: true, role: true },
                },
            },
        });
        const details = `${req.userName || "User"} moved ${task.title} from ${formatStatus(previousStatus)} → ${formatStatus(status)}`;
        // 1. Record Activity Log in Database
        const activityLog = await prisma.activityLog.create({
            data: {
                taskId: task.id,
                projectId: task.project.id,
                userId: req.userId,
                action: "STATUS_CHANGE",
                fromStatus: previousStatus,
                toStatus: status,
                details,
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true },
                },
            },
        });
        // 2. Notification trigger when moved to IN_REVIEW
        if (status === TaskStatus.IN_REVIEW) {
            const pmNotification = await prisma.notification.create({
                data: {
                    userId: task.project.projectManagerId,
                    title: "Task Moved to In Review",
                    message: `${req.userName || "Developer"} moved "${task.title}" to In Review for project "${task.project.name}".`,
                    type: "TASK_IN_REVIEW",
                    taskId: task.id,
                    projectId: task.project.id,
                },
            });
            await emitNotification(task.project.projectManagerId, pmNotification);
        }
        // 3. Real-Time Broadcasts:
        broadcastActivity({
            id: activityLog.id,
            taskId: task.id,
            projectId: task.project.id,
            action: activityLog.action,
            details: activityLog.details,
            createdAt: activityLog.createdAt,
            user: activityLog.user,
            projectPmId: task.project.projectManagerId,
            taskAssigneeId: task.assignedToId,
        });
        broadcastTaskUpdate(task.project.id, updatedTask);
        res.status(200).json({
            success: true,
            message: "Task status updated successfully",
            task: updatedTask,
            activity: activityLog,
        });
    }
    catch (error) {
        console.error("Update Task Status Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to update task status" },
        });
    }
};
/* =========================================================
   UPDATE TASK (Admin or PM only)
========================================================= */
export const updateTask = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const { title, description, status, priority, dueDate, assignedToId } = req.body;
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                project: true,
            },
        });
        if (!task) {
            res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Task not found" },
            });
            return;
        }
        if (req.userRole === Role.PROJECT_MANAGER &&
            task.project.projectManagerId !== req.userId) {
            res.status(403).json({
                success: false,
                error: {
                    code: "FORBIDDEN",
                    message: "You cannot edit tasks in another PM's project",
                },
            });
            return;
        }
        const updateData = {};
        if (title !== undefined)
            updateData.title = title.trim();
        if (description !== undefined)
            updateData.description = description ? description.trim() : null;
        if (status !== undefined)
            updateData.status = status;
        if (priority !== undefined)
            updateData.priority = priority;
        if (dueDate !== undefined) {
            updateData.dueDate = new Date(dueDate);
            if (updateData.dueDate < new Date() && status !== TaskStatus.DONE) {
                updateData.isOverdue = true;
            }
            else {
                updateData.isOverdue = false;
            }
        }
        let reassigned = false;
        if (assignedToId && assignedToId !== task.assignedToId) {
            const dev = await prisma.user.findUnique({
                where: { id: assignedToId },
            });
            if (!dev || dev.role !== Role.DEVELOPER) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: "INVALID_USER",
                        message: "Assigned user must be a DEVELOPER",
                    },
                });
                return;
            }
            updateData.assignedToId = assignedToId;
            reassigned = true;
        }
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: {
                project: {
                    select: { id: true, name: true, projectManagerId: true },
                },
                assignedTo: {
                    select: { id: true, name: true, email: true, role: true },
                },
            },
        });
        if (reassigned) {
            const notif = await prisma.notification.create({
                data: {
                    userId: assignedToId,
                    title: "Task Assigned",
                    message: `You were assigned to "${updatedTask.title}" in ${updatedTask.project.name}`,
                    type: "TASK_ASSIGNED",
                    taskId: updatedTask.id,
                    projectId: updatedTask.project.id,
                },
            });
            await emitNotification(assignedToId, notif);
        }
        broadcastTaskUpdate(task.projectId, updatedTask);
        res.status(200).json({
            success: true,
            message: "Task updated successfully",
            task: updatedTask,
        });
    }
    catch (error) {
        console.error("Update Task Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to update task" },
        });
    }
};
/* =========================================================
   DELETE TASK (Admin or PM)
========================================================= */
export const deleteTask = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { project: true },
        });
        if (!task) {
            res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Task not found" },
            });
            return;
        }
        if (req.userRole === Role.PROJECT_MANAGER &&
            task.project.projectManagerId !== req.userId) {
            res.status(403).json({
                success: false,
                error: {
                    code: "FORBIDDEN",
                    message: "You cannot delete tasks in another PM's project",
                },
            });
            return;
        }
        await prisma.task.delete({ where: { id: taskId } });
        res.status(200).json({
            success: true,
            message: "Task deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete Task Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to delete task" },
        });
    }
};
/* =========================================================
   GET DEVELOPERS (For assigning tasks)
========================================================= */
export const getDevelopers = async (_req, res) => {
    try {
        const developers = await prisma.user.findMany({
            where: { role: Role.DEVELOPER },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
            orderBy: { name: "asc" },
        });
        res.status(200).json({
            success: true,
            developers,
        });
    }
    catch (error) {
        console.error("Get Developers Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to fetch developers" },
        });
    }
};
//# sourceMappingURL=task.controller.js.map