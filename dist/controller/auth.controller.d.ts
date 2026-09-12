import type { Request, Response } from "express";
import { z } from "zod";
export declare const registerSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        ADMIN: "ADMIN";
        DEVELOPER: "DEVELOPER";
        PROJECT_MANAGER: "PROJECT_MANAGER";
    }>>>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const generateToken: (userId: string) => string;
export declare const generateRefreshToken: (userId: string) => string;
export declare const register: (req: Request, res: Response) => Promise<void>;
export declare const login: (req: Request, res: Response) => Promise<void>;
export declare const refreshToken: (req: Request, res: Response) => Promise<void>;
export declare const logout: (_req: Request, res: Response) => Promise<void>;
export declare const getMe: (req: Request, res: Response) => Promise<void>;
export declare const getUsers: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map