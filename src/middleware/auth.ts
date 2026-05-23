import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

async function getUserFromToken(req: Request) {
  const token = req.cookies.token;
  if (!token) return null;
  const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
  return prisma.user.findUnique({ where: { id: decoded.id } });
}

export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.isTrashed)
      return res.status(401).json({ message: "Account deactivated" });
    // @ts-ignore
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Token expired" });
  }
};

export const verifyUserInactive = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Token expired" });
  }
};

export const verifyAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== "admin")
      return res.status(403).json({ message: "Admin access required" });
    // @ts-ignore
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Token expired" });
  }
};
