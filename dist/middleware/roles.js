import { Role } from "@prisma/client";
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.userId || !req.userRole) {
            res.status(401).json({
                success: false,
                error: {
                    code: "UNAUTHORIZED",
                    message: "Authentication required",
                },
            });
            return;
        }
        if (!allowedRoles.includes(req.userRole)) {
            res.status(403).json({
                success: false,
                error: {
                    code: "FORBIDDEN",
                    message: "You do not have permission to perform this action",
                },
            });
            return;
        }
        next();
    };
};
//# sourceMappingURL=roles.js.map