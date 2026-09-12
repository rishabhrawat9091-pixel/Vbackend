import type { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
export declare const authorizeRoles: (...allowedRoles: Role[]) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=roles.d.ts.map