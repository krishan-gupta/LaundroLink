import { Request, Response, NextFunction } from "express";
import { User } from "@shared/schema";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes((req.user as User).role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  const u = req.user as User;
  if (u.role !== "staff" && u.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  if ((req.user as User).role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
}
