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

function sessionExpired(res: Response) {
  res.clearCookie("token", COOKIE_OPTIONS);
  return res.status(401).json({
    success: false,
    message: "Session expired. Please login again.",
    logout: true,
  });
}

/**
 * Decodes the JWT and attaches { id, phone, role } to req.user.
 * No DB call. All role-based guards after this are free.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;
    if (!token) return sessionExpired(res);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; phone: string; role: string };
    // @ts-ignore
    req.user = decoded;
    next();
  } catch {
    return sessionExpired(res);
  }
};

/**
 * Returns a middleware that allows only the specified roles.
 * Must be used after `authenticate`.
 *
 * Usage:
 *   router.get("/", authenticate, requireRoles("admin", "manager"), handler)
 *   router.use(authenticate);
 *   router.get("/x", requireRoles("admin"), handler)
 */
export const requireRoles = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const role: string = req.user?.role;
    if (!roles.includes(role))
      return res.status(403).json({ message: "Access required" });
    next();
  };

/**
 * Hits the DB once to confirm the user still exists and is not trashed.
 * Use only on routes where a deactivated-account check is truly needed
 * (e.g. login-like flows, sensitive mutations).
 * Must be used after `authenticate`.
 */
export const verifyActiveUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    const id: number = req.user?.id;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return sessionExpired(res);
    if (user.isTrashed) return res.status(401).json({ message: "Account deactivated" });
    // @ts-ignore
    req.user = user; // upgrade from JWT payload to full DB record
    next();
  } catch {
    return sessionExpired(res);
  }
};

// ─── Backwards-compatible named exports ──────────────────────────────────────
// Each export is: [authenticate, verifyActiveUser (DB, isTrashed check), requireRoles?]
// Single DB call per request, isTrashed always enforced on protected routes.

export const verifyUser = [authenticate, verifyActiveUser];
export const verifyUserInactive = [authenticate]; // intentionally skips isTrashed check
export const verifyAdmin = [authenticate, verifyActiveUser, requireRoles("admin")];
export const verifyAdminOrManager = [authenticate, verifyActiveUser, requireRoles("admin", "manager")];
export const verifyAdminManagerOrSupport = [authenticate, verifyActiveUser, requireRoles("admin", "manager", "support")];
export const verifyAdminManagerSupportOrDesigner = [authenticate, verifyActiveUser, requireRoles("admin", "manager", "support", "designer")];
export const verifyAdminManagerDesignerOrSupport = [authenticate, verifyActiveUser, requireRoles("admin", "manager", "designer", "support")];
export const verifyAdminManagerSupportOrProduction = [authenticate, verifyActiveUser, requireRoles("admin", "manager", "support", "production")];
export const verifyAdminManagerSupportDesignerOrProduction = [authenticate, verifyActiveUser, requireRoles("admin", "manager", "support", "designer", "production")];
