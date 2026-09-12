import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { Role, TaskStatus, TaskPriority } from "@prisma/client";
import { getOnlineCount } from "../lib/socket.js";

/* =========================================================
   ADMIN DASHBOARD STATS
========================================================= */
export const getAdminStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const totalProjects = await prisma.project.count();
    const totalClients = await prisma.client.count();
    const totalUsers = await prisma.user.count();

    const tasksByStatus = await prisma.task.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const statusCounts: Record<string, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    tasksByStatus.forEach((item) => {
      statusCounts[item.status] = item._count.id;
    });

    const totalTasks = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    const overdueCount = await prisma.task.count({
      where: {
        OR: [
          { isOverdue: true },
          {
            dueDate: { lt: new Date() },
            status: { not: TaskStatus.DONE },
          },
        ],
      },
    });

    const activeUsers = getOnlineCount();

    res.status(200).json({
      success: true,
      stats: {
        totalProjects,
        totalClients,
        totalUsers,
        totalTasks,
        tasksByStatus: statusCounts,
        overdueCount,
        activeUsers,
      },
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to fetch admin stats" },
    });
  }
};

/* =========================================================
   PM DASHBOARD STATS
========================================================= */
export const getPmStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const pmId = req.userId!;

    const pmProjects = await prisma.project.findMany({
      where: { projectManagerId: pmId },
      include: {
        client: true,
        tasks: {
          select: {
            id: true,
            status: true,
            priority: true,
            dueDate: true,
            isOverdue: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const projectSummary = pmProjects.map((p) => {
      const todo = p.tasks.filter((t) => t.status === TaskStatus.TODO).length;
      const inProgress = p.tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
      const inReview = p.tasks.filter((t) => t.status === TaskStatus.IN_REVIEW).length;
      const done = p.tasks.filter((t) => t.status === TaskStatus.DONE).length;
      const overdue = p.tasks.filter(
        (t) => t.isOverdue || (t.status !== TaskStatus.DONE && new Date(t.dueDate) < new Date())
      ).length;

      return {
        id: p.id,
        name: p.name,
        clientName: p.client?.name || "Direct Client",
        totalTasks: p.tasks.length,
        todo,
        inProgress,
        inReview,
        done,
        overdue,
      };
    });

    // Tasks by priority in PM projects
    const tasksByPriorityRaw = await prisma.task.groupBy({
      by: ["priority"],
      where: {
        project: { projectManagerId: pmId },
      },
      _count: { id: true },
    });

    const tasksByPriority: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    tasksByPriorityRaw.forEach((item) => {
      tasksByPriority[item.priority] = item._count.id;
    });

    // Upcoming due dates this week (next 7 days)
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingTasks = await prisma.task.findMany({
      where: {
        project: { projectManagerId: pmId },
        status: { not: TaskStatus.DONE },
        dueDate: {
          gte: now,
          lte: nextWeek,
        },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    res.status(200).json({
      success: true,
      stats: {
        totalProjects: pmProjects.length,
        projectsSummary: projectSummary,
        tasksByPriority,
        upcomingTasks,
      },
    });
  } catch (error) {
    console.error("PM Stats Error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to fetch PM stats" },
    });
  }
};

/* =========================================================
   DEVELOPER DASHBOARD STATS
========================================================= */
export const getDeveloperStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const devId = req.userId!;

    const priorityWeight: Record<TaskPriority, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    const tasks = await prisma.task.findMany({
      where: { assignedToId: devId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ dueDate: "asc" }],
    });

    // Sort by priority (CRITICAL -> HIGH -> MEDIUM -> LOW) then by dueDate
    tasks.sort((a, b) => {
      const weightDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (weightDiff !== 0) return weightDiff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === TaskStatus.TODO).length;
    const inProgress = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
    const inReview = tasks.filter((t) => t.status === TaskStatus.IN_REVIEW).length;
    const done = tasks.filter((t) => t.status === TaskStatus.DONE).length;
    const overdue = tasks.filter(
      (t) => t.isOverdue || (t.status !== TaskStatus.DONE && new Date(t.dueDate) < new Date())
    ).length;

    res.status(200).json({
      success: true,
      stats: {
        total,
        todo,
        inProgress,
        inReview,
        done,
        overdue,
        assignedTasks: tasks,
      },
    });
  } catch (error) {
    console.error("Developer Stats Error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to fetch developer stats" },
    });
  }
};
