import type { Request, Response } from "express";
import { z } from "zod";
export declare const clientSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    company: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const getClients: (_req: Request, res: Response) => Promise<void>;
export declare const createClient: (req: Request, res: Response) => Promise<void>;
export declare const updateClient: (req: Request, res: Response) => Promise<void>;
export declare const deleteClient: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=client.controller.d.ts.map