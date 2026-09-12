import type { Request, Response } from "express";
import { z } from "zod";
export declare const createTaskSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        TODO: 'TODO';
        IN_PROGRESS: 'IN_PROGRESS';
        IN_REVIEW: 'IN_REVIEW';
        DONE: 'DONE';
    }>>>;
    priority: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        LOW: 'LOW';
        MEDIUM: 'MEDIUM';
        HIGH: 'HIGH';
        CRITICAL: 'CRITICAL';
    }>>>;
    dueDate: z.ZodString;
    projectId: z.ZodString;
    assignedToId: z.ZodString;
}, z.core.$strip>;
export declare const updateTaskStatusSchema: z.ZodObject<{
    status: z.ZodEnum<{
        TODO: 'TODO';
        IN_PROGRESS: 'IN_PROGRESS';
        IN_REVIEW: 'IN_REVIEW';
        DONE: 'DONE';
    }>;
}, z.core.$strip>;
export declare const updateTaskSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        TODO: 'TODO';
        IN_PROGRESS: 'IN_PROGRESS';
        IN_REVIEW: 'IN_REVIEW';
        DONE: 'DONE';
    }>>;
    priority: z.ZodOptional<z.ZodEnum<{
        LOW: 'LOW';
        MEDIUM: 'MEDIUM';
        HIGH: 'HIGH';
        CRITICAL: 'CRITICAL';
    }>>;
    dueDate: z.ZodOptional<z.ZodString>;
    assignedToId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createTask: (req: Request, res: Response) => Promise<void>;
export declare const getTasks: (req: Request, res: Response) => Promise<void>;
export declare const getTaskById: (req: Request, res: Response) => Promise<void>;
export declare const updateTaskStatus: (req: Request, res: Response) => Promise<void>;
export declare const updateTask: (req: Request, res: Response) => Promise<void>;
export declare const deleteTask: (req: Request, res: Response) => Promise<void>;
export declare const getDevelopers: (_req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=task.controller.d.ts.map