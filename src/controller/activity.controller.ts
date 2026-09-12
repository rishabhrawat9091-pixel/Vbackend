import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { Role } from "@prisma/client";

export const getActivityFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const where: any = {};

    if (req.userRole === Role.ADMIN) {
      // Admin sees global activity across all projects
    } else if (req.userRole === Role.PROJECT_MANAGER) {
      // PM sees activity only from their own projects
      where.project = {
        projectManagerId: req.userId,
      };
    } else if (req.userRole === Role.DEVELOPER) {
      // Developer sees activity only on tasks assigned to them
      where.task = {
        assignedToId: req.userId,
      };
    }

    // Must return the last 20 activity events from DB
    const activities = await prisma.activityLog.findMany({
      where,
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error("Get Activity Feed Error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to retrieve activity feed" },
    });
  }
};
