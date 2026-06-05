import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("JWT_SECRET env variable is required");

const IS_PROD = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: (IS_PROD ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function signToken(user: { id: number; phone: string; role: string }) {
  return jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

function safeUser(user: { id: number; name: string; phone: string; role: string; isTrashed: boolean; image: string | null }) {
  return { id: user.id, name: user.name, phone: user.phone, role: user.role, isTrashed: user.isTrashed, image: user.image };
}

function requireAdmin(req: Request, res: Response): { id: number; role: string } | null {
  try {
    const token = req.cookies.token;
    if (!token) { res.status(401).json({ message: "Unauthorized" }); return null; }
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    if (decoded.role !== "admin" && decoded.role !== "manager") { res.status(403).json({ message: "Admin only" }); return null; }
    return decoded;
  } catch {
    res.status(401).json({ message: "Token expired" });
    return null;
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ message: "Phone and password required" });

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isTrashed) return res.status(403).json({ message: "Account is deactivated" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    res.cookie("token", signToken(user), COOKIE_OPTIONS);
    return res.json({ message: "Login successful", user: safeUser(user) });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function signup(req: Request, res: Response) {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ message: "Name, phone and password required" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) return res.status(409).json({ message: "Phone already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, phone, password: hashed } });

    res.cookie("token", signToken(user), COOKIE_OPTIONS);
    return res.status(201).json({ message: "Registration successful", user: safeUser(user) });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function me(req: Request, res: Response) {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user: safeUser(user) });
  } catch {
    return res.status(401).json({ message: "Token expired" });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const token = req.cookies.token;

    // Missing token
    if (!token) {
      res.clearCookie("token", COOKIE_OPTIONS);
      return res.status(401).json({ success: false, message: "Session expired. Please login again.", logout: true });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      res.clearCookie("token", COOKIE_OPTIONS);
      return res.status(401).json({ success: false, message: "Session expired. Please login again.", logout: true });
    }

    res.cookie("token", signToken(user), COOKIE_OPTIONS);
    return res.json({ user: safeUser(user) });
  } catch {
    // Expired, invalid, or malformed token
    res.clearCookie("token", COOKIE_OPTIONS);
    return res.status(401).json({ success: false, message: "Session expired. Please login again.", logout: true });
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie("token", COOKIE_OPTIONS);
  return res.json({ message: "Logged out" });
}



// ── Admin: User CRUD ──────────────────────────────────────────────

export async function getUsers(req: Request, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    const { trash, search, page = "1", limit = "20", role } = req.query;
    const where: any = { isTrashed: trash === "true" };

    if (search) {
      const s = search as string;
      where.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { phone: { contains: s, mode: "insensitive" } },
      ];
    }

    if (role) where.role = role;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, phone: true, role: true, isTrashed: true, image: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({ users, total, page: parseInt(page as string), limit: take });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function createUser(req: Request, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    const { name, phone, password, role } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ message: "Name, phone and password required" });

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) return res.status(409).json({ message: "Phone already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, phone, password: hashed, role: role || "customer" } });
    return res.status(201).json({ message: "User created", user: safeUser(user) });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateUser(req: Request, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { name, phone, role, password } = req.body;
    const data: any = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (role) data.role = role;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({ where: { id }, data });
    return res.json({ message: "User updated", user: safeUser(user) });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function moveUserToTrash(req: Request, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    await prisma.user.update({ where: { id }, data: { isTrashed: true } });
    return res.json({ message: "User moved to trash" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function restoreUser(req: Request, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    await prisma.user.update({ where: { id }, data: { isTrashed: false } });
    return res.json({ message: "User restored" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function permanentDeleteUser(req: Request, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    await prisma.user.delete({ where: { id } });
    return res.json({ message: "User permanently deleted" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current and new password required" });
    if (newPassword.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: decoded.id }, data: { password: hashed } });
    return res.json({ message: "Password changed successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
}
