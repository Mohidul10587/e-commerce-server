import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("JWT_SECRET env variable is required");
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
};

/** Clears the token cookie and returns a standardised session-expired response. */
function sessionExpired(res: Response) {
  res.clearCookie("token", COOKIE_OPTIONS);
  return res.status(401).json({
    success: false,
    message: "Session expired. Please login again.",
    logout: true,
  });
}

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
    const token = req.cookies.token;
    // Missing or empty token → session expired
    if (!token) return sessionExpired(res);

    const user = await getUserFromToken(req);
    if (!user) return sessionExpired(res);
    if (user.isTrashed)
      return res.status(401).json({ message: "Account deactivated" });
    // @ts-ignore
    req.user = user;
    next();
  } catch {
    // Covers: expired, invalid signature, malformed token
    return sessionExpired(res);
  }
};

export const verifyUserInactive = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;
    if (!token) return sessionExpired(res);

    const user = await getUserFromToken(req);
    if (!user) return sessionExpired(res);
    // @ts-ignore
    req.user = user;
    next();
  } catch {
    return sessionExpired(res);
  }
};

export const verifyAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;
    if (!token) return sessionExpired(res);

    const user = await getUserFromToken(req);
    if (!user) return sessionExpired(res);
    if (user.role !== "admin")
      return res.status(403).json({ message: "Admin access required" });
    // @ts-ignore
    req.user = user;
    next();
  } catch {
    return sessionExpired(res);
  }
};

export const verifyAdminOrManager = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;
    if (!token) return sessionExpired(res);

    const user = await getUserFromToken(req);
    if (!user) return sessionExpired(res);
    if (user.role !== "admin" && user.role !== "manager")
      return res.status(403).json({ message: "Access required" });
    // @ts-ignore
    req.user = user;
    next();
  } catch {
    return sessionExpired(res);
  }
};

export const verifyAdminManagerOrSupport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;
    if (!token) return sessionExpired(res);

    const user = await getUserFromToken(req);
    if (!user) return sessionExpired(res);
    if (user.role !== "admin" && user.role !== "manager" && user.role !== "support")
      return res.status(403).json({ message: "Access required" });
    // @ts-ignore
    req.user = user;
    next();
  } catch {
    return sessionExpired(res);
  }
};

/** Admin, Manager, Support, Designer, Production */
export const verifyAdminManagerSupportDesignerOrProduction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;
    if (!token) return sessionExpired(res);

    const user = await getUserFromToken(req);
    if (!user) return sessionExpired(res);
    const allowed = ["admin", "manager", "support", "designer", "production"];
    if (!allowed.includes(user.role))
      return res.status(403).json({ message: "Access required" });
    // @ts-ignore
    req.user = user;
    next();
  } catch {
    return sessionExpired(res);
  }
};

/** Admin, Manager, Support, Production (for inventory) */
export const verifyAdminManagerSupportOrProduction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;
    if (!token) return sessionExpired(res);

    const user = await getUserFromToken(req);
    if (!user) return sessionExpired(res);
    const allowed = ["admin", "manager", "support", "production"];
    if (!allowed.includes(user.role))
      return res.status(403).json({ message: "Access required" });
    // @ts-ignore
    req.user = user;
    next();
  } catch {
    return sessionExpired(res);
  }
};

/** Admin, Manager, Support, Designer (for assign designer) */
export const verifyAdminManagerSupportOrDesigner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;
    if (!token) return sessionExpired(res);

    const user = await getUserFromToken(req);
    if (!user) return sessionExpired(res);
    const allowed = ["admin", "manager", "support", "designer"];
    if (!allowed.includes(user.role))
      return res.status(403).json({ message: "Access required" });
    // @ts-ignore
    req.user = user;
    next();
  } catch {
    return sessionExpired(res);
  }
};
