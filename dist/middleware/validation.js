import { ZodError } from "zod";
export const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                const issues = error.issues.map((i) => ({
                    path: i.path.join("."),
                    message: i.message,
                }));
                res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Validation failed on request payload",
                        details: issues,
                    },
                });
                return;
            }
            next(error);
        }
    };
};
export const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                const issues = error.issues.map((i) => ({
                    path: i.path.join("."),
                    message: i.message,
                }));
                res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Validation failed on query parameters",
                        details: issues,
                    },
                });
                return;
            }
            next(error);
        }
    };
};
//# sourceMappingURL=validation.js.map