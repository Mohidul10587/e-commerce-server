import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ZodError) {
    const firstError = err.issues[0].message;
    return res.status(400).json({ message: JSON.parse(firstError) });
  }

  if (err?.code === "P1001" || err?.code === "P1002") {
    return res
      .status(503)
      .json({ message: "Database unavailable, please retry" });
  }

  return res.status(500).json({
    message: err.message || {
      en: "Internal server error",
      bn: "Internal server error",
    },
  });
};
