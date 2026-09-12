import cron from "node-cron";
import prisma from "./prisma.js";
import { getIO } from "./socket.js";
import { TaskStatus } from "@prisma/client";

export const checkAndFlagOverdueTasks = async (retryCount = 0): Promise<number> => {
  try {
    const now = new Date();

    // Find tasks past their due date that are not DONE and not already flagged as isOverdue
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          lt: now,
        },
        status: {
          not: TaskStatus.DONE,
        },
        isOverdue: false,
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        assignedToId: true,
      },
    });

    if (overdueTasks.length === 0) {
      return 0;
    }

    const taskIds = overdueTasks.map((t) => t.id);

    // Update in database
    await prisma.task.updateMany({
      where: {
        id: {
          in: taskIds,
        },
      },
      data: {
        isOverdue: true,
      },
    });

    console.log(`⏰ [Cron] Flagged ${overdueTasks.length} tasks as Overdue at ${now.toISOString()}`);

    // Emit real-time notification to clients
    try {
      const io = getIO();
      io.emit("tasks:overdue_updated", { count: overdueTasks.length, taskIds });
    } catch {
      // Socket might not be ready yet
    }

    return overdueTasks.length;
  } catch (error: any) {
    // If Neon database is waking up from cold standby (P1001), retry once after 3 seconds
    if (error?.code === "P1001" && retryCount < 2) {
      console.warn(`⏳ [Cron] Database waking up from standby, retrying check in 3s... (attempt ${retryCount + 1})`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return checkAndFlagOverdueTasks(retryCount + 1);
    }

    console.error("❌ [Cron] Error running overdue task check:", error?.message || error);
    return 0;
  }
};

export const startOverdueScheduler = () => {
  // Run every minute: "* * * * *"
  cron.schedule("* * * * *", async () => {
    await checkAndFlagOverdueTasks();
  });

  // Run on startup after brief 2-second grace period for server listen
  setTimeout(() => {
    checkAndFlagOverdueTasks();
  }, 2000);

  console.log("⏰ Overdue Task Cron Scheduler initialized (running every 60s)");
};
