import type { Request, Response } from "express";
import { z } from "zod";
export declare const createProjectSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    projectManagerId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateProjectSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    projectManagerId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createProject: (req: Request, res: Response) => Promise<void>;
export declare const getProjects: (req: Request, res: Response) => Promise<void>;
export declare const getProjectById: (req: Request, res: Response) => Promise<void>;
export declare const updateProject: (req: Request, res: Response) => Promise<void>;
export declare const deleteProject: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=project.controller.d.ts.map