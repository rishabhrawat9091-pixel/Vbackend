import { Role } from "@prisma/client";

export {};

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: Role;
      userName?: string;
      userEmail?: string;
    }
  }
}