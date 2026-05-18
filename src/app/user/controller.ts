import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function signToken(user: { id: number; phone: string; role: string }) {
  return jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

function safeUser(user: { id: number; name: string; phone: string; role: string; isActive: boolean; image: string | null }) {
  return { id: user.id, name: user.name, phone: user.phone, role: user.role, isActive: user.isActive, image: user.image };
}

export async function login(req: Request, res: Response) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ message: "Phone and password required" });

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    res.cookie("token", signToken(user), COOKIE_OPTIONS);
    return res.json({ message: "Login successful", user: safeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function signup(req: Request, res: Response) {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ message: "Name, phone and password required" });

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) return res.status(409).json({ message: "Phone already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, phone, password: hashed } });

    res.cookie("token", signToken(user), COOKIE_OPTIONS);
    return res.status(201).json({ message: "Registration successful", user: safeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
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
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.cookie("token", signToken(user), COOKIE_OPTIONS);
    return res.json({ user: safeUser(user) });
  } catch {
    return res.status(401).json({ message: "Token expired" });
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie("token");
  return res.json({ message: "Logged out" });
}

// ── Admin: User CRUD ──────────────────────────────────────────────

function requireAdmin(req: Request, res: Response): { id: number } | null {
  try {
    const token = req.cookies.token;
    if (!token) { res.status(401).json({ message: "Unauthorized" }); return null; }
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    if (decoded.role !== "admin") { res.status(403).json({ message: "Admin only" }); return null; }
    return decoded;
  } catch {
    res.status(401).json({ message: "Token expired" });
    return null;
  }
}

export async function getUsers(req: Request, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, phone: true, role: true, isActive: true, image: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
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
    const user = await prisma.user.create({
      data: { name, phone, password: hashed, role: role || "customer" },
    });
    return res.status(201).json({ message: "User created", user: safeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function updateUser(req: Request, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { name, phone, role, isActive, password } = req.body;

    const data: any = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (role) data.role = role;
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({ where: { id }, data });
    return res.json({ message: "User updated", user: safeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function deleteUser(req: Request, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    await prisma.user.delete({ where: { id } });
    return res.json({ message: "User deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}

export async function toggleActive(req: Request, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const updated = await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
    return res.json({ message: "Updated", user: safeUser(updated) });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
}
