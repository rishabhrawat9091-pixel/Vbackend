import prisma from "../lib/prisma.js";
export const getNotifications = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: { code: "UNAUTHORIZED", message: "User not authenticated" },
            });
            return;
        }
        const notifications = await prisma.notification.findMany({
            where: { userId },
            take: 30,
            orderBy: { createdAt: "desc" },
        });
        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false },
        });
        res.status(200).json({
            success: true,
            notifications,
            unreadCount,
        });
    }
    catch (error) {
        console.error("Get Notifications Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to fetch notifications" },
        });
    }
};
export const markAsRead = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: { code: "UNAUTHORIZED", message: "User not authenticated" },
            });
            return;
        }
        const notif = await prisma.notification.findUnique({
            where: { id },
        });
        if (!notif || notif.userId !== userId) {
            res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Notification not found" },
            });
            return;
        }
        const updated = await prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false },
        });
        res.status(200).json({
            success: true,
            notification: updated,
            unreadCount,
        });
    }
    catch (error) {
        console.error("Mark Notification Read Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to update notification" },
        });
    }
};
export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: { code: "UNAUTHORIZED", message: "User not authenticated" },
            });
            return;
        }
        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        res.status(200).json({
            success: true,
            message: "All notifications marked as read",
            unreadCount: 0,
        });
    }
    catch (error) {
        console.error("Mark All Read Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to mark notifications as read" },
        });
    }
};
export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: { code: "UNAUTHORIZED", message: "User not authenticated" },
            });
            return;
        }
        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false },
        });
        res.status(200).json({
            success: true,
            unreadCount,
        });
    }
    catch (error) {
        console.error("Get Unread Count Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to fetch unread count" },
        });
    }
};
//# sourceMappingURL=notification.controller.js.map