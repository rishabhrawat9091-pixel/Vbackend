import prisma from "../lib/prisma.js";
import { Role } from "@prisma/client";
import { z } from "zod";
export const createProjectSchema = z.object({
    name: z.string().min(2, "Project name must be at least 2 characters"),
    description: z.string().optional(),
    clientId: z.string().optional().nullable(),
    projectManagerId: z.string().optional(),
});
export const updateProjectSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    clientId: z.string().optional().nullable(),
    projectManagerId: z.string().optional(),
});
/* =========================================================
   CREATE PROJECT (Admin or PM)
========================================================= */
export const createProject = async (req, res) => {
    try {
        const { name, description, clientId, projectManagerId } = req.body;
        let targetPmId = req.userId;
        if (req.userRole === Role.ADMIN) {
            if (projectManagerId) {
                const pm = await prisma.user.findUnique({
                    where: { id: projectManagerId },
                });
                if (!pm) {
                    res.status(404).json({
                        success: false,
                        error: { code: "NOT_FOUND", message: "Specified Project Manager not found" },
                    });
                    return;
                }
                targetPmId = pm.id;
            }
        }
        else if (req.userRole === Role.PROJECT_MANAGER) {
            targetPmId = req.userId;
        }
        else {
            res.status(403).json({
                success: false,
                error: { code: "FORBIDDEN", message: "Developers cannot create projects" },
            });
            return;
        }
        if (clientId) {
            const client = await prisma.client.findUnique({ where: { id: clientId } });
            if (!client) {
                res.status(404).json({
                    success: false,
                    error: { code: "NOT_FOUND", message: "Client not found" },
                });
                return;
            }
        }
        const project = await prisma.project.create({
            data: {
                name: name.trim(),
                description: description ? description.trim() : null,
                clientId: clientId || null,
                projectManagerId: targetPmId,
            },
            include: {
                client: true,
                projectManager: {
                    select: { id: true, name: true, email: true, role: true },
                },
                _count: {
                    select: { tasks: true },
                },
            },
        });
        res.status(201).json({
            success: true,
            message: "Project created successfully",
            project,
        });
    }
    catch (error) {
        console.error("Create Project Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to create project" },
        });
    }
};
/* =========================================================
   GET PROJECTS (Role-filtered)
========================================================= */
export const getProjects = async (req, res) => {
    try {
        const where = {};
        if (req.userRole === Role.ADMIN) {
            // Admin sees all projects
        }
        else if (req.userRole === Role.PROJECT_MANAGER) {
            where.projectManagerId = req.userId;
        }
        else if (req.userRole === Role.DEVELOPER) {
            where.tasks = {
                some: {
                    assignedToId: req.userId,
                },
            };
        }
        const projects = await prisma.project.findMany({
            where,
            include: {
                client: true,
                projectManager: {
                    select: { id: true, name: true, email: true, role: true },
                },
                tasks: {
                    select: {
                        id: true,
                        status: true,
                        priority: true,
                        isOverdue: true,
                        dueDate: true,
                        assignedToId: true,
                    },
                },
                _count: {
                    select: { tasks: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        const formatted = projects.map((p) => {
            const relevantTasks = req.userRole === Role.DEVELOPER
                ? p.tasks.filter((t) => t.assignedToId === req.userId)
                : p.tasks;
            const todoCount = relevantTasks.filter((t) => t.status === "TODO").length;
            const inProgressCount = relevantTasks.filter((t) => t.status === "IN_PROGRESS").length;
            const inReviewCount = relevantTasks.filter((t) => t.status === "IN_REVIEW").length;
            const doneCount = relevantTasks.filter((t) => t.status === "DONE").length;
            const overdueCount = relevantTasks.filter((t) => t.isOverdue || (t.status !== "DONE" && new Date(t.dueDate) < new Date())).length;
            return {
                id: p.id,
                name: p.name,
                description: p.description,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
                client: p.client,
                projectManager: p.projectManager,
                totalTasks: relevantTasks.length,
                todoCount,
                inProgressCount,
                inReviewCount,
                doneCount,
                overdueCount,
            };
        });
        res.status(200).json({
            success: true,
            projects: formatted,
        });
    }
    catch (error) {
        console.error("Get Projects Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to retrieve projects" },
        });
    }
};
/* =========================================================
   GET PROJECT BY ID (Strict role-based access)
========================================================= */
export const getProjectById = async (req, res) => {
    try {
        const id = req.params.id;
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                client: true,
                projectManager: {
                    select: { id: true, name: true, email: true, role: true },
                },
                tasks: {
                    include: {
                        assignedTo: {
                            select: { id: true, name: true, email: true, role: true },
                        },
                    },
                    orderBy: { dueDate: "asc" },
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
        if (req.userRole === Role.PROJECT_MANAGER && project.projectManagerId !== req.userId) {
            res.status(403).json({
                success: false,
                error: { code: "FORBIDDEN", message: "You cannot access another Project Manager's project" },
            });
            return;
        }
        if (req.userRole === Role.DEVELOPER) {
            const hasAssignedTask = project.tasks.some((t) => t.assignedToId === req.userId);
            if (!hasAssignedTask) {
                res.status(403).json({
                    success: false,
                    error: { code: "FORBIDDEN", message: "You do not have permission to view this project" },
                });
                return;
            }
            project.tasks = project.tasks.filter((t) => t.assignedToId === req.userId);
        }
        res.status(200).json({
            success: true,
            project,
        });
    }
    catch (error) {
        console.error("Get Project By ID Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to retrieve project" },
        });
    }
};
/* =========================================================
   UPDATE PROJECT
========================================================= */
export const updateProject = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, description, clientId, projectManagerId } = req.body;
        const existing = await prisma.project.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Project not found" },
            });
            return;
        }
        if (req.userRole === Role.PROJECT_MANAGER && existing.projectManagerId !== req.userId) {
            res.status(403).json({
                success: false,
                error: { code: "FORBIDDEN", message: "You cannot update another PM's project" },
            });
            return;
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name.trim();
        if (description !== undefined)
            updateData.description = description ? description.trim() : null;
        if (clientId !== undefined)
            updateData.clientId = clientId || null;
        if (projectManagerId && req.userRole === Role.ADMIN) {
            updateData.projectManagerId = projectManagerId;
        }
        const updated = await prisma.project.update({
            where: { id },
            data: updateData,
            include: {
                client: true,
                projectManager: {
                    select: { id: true, name: true, email: true, role: true },
                },
            },
        });
        res.status(200).json({
            success: true,
            message: "Project updated successfully",
            project: updated,
        });
    }
    catch (error) {
        console.error("Update Project Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to update project" },
        });
    }
};
/* =========================================================
   DELETE PROJECT
========================================================= */
export const deleteProject = async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await prisma.project.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Project not found" },
            });
            return;
        }
        if (req.userRole === Role.PROJECT_MANAGER && existing.projectManagerId !== req.userId) {
            res.status(403).json({
                success: false,
                error: { code: "FORBIDDEN", message: "You cannot delete another PM's project" },
            });
            return;
        }
        await prisma.project.delete({ where: { id } });
        res.status(200).json({
            success: true,
            message: "Project deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete Project Error:", error);
        res.status(500).json({
            success: false,
            error: { code: "SERVER_ERROR", message: "Failed to delete project" },
        });
    }
};
//# sourceMappingURL=project.controller.js.map