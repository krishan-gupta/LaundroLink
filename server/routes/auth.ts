import { Router } from "express";
import passport from "passport";
import { storage } from "../storage";
import { hashPassword } from "../auth";
import { insertUserSchema, loginSchema, updateProfileSchema, type User } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { requireAuth } from "../middleware";

const router = Router();

router.post("/auth/register", async (req, res) => {
  try {
    if (req.body.authCode !== "1234") {
      return res.status(403).json({ message: "Invalid authorization code" });
    }
    const data = insertUserSchema.parse(req.body);
    const existing = await storage.getUserByUsername(data.username);
    if (existing) return res.status(409).json({ message: "Username already taken" });
    const hashed = await hashPassword(data.password);
    const user = await storage.createUser({ ...data, password: hashed });
    const { password: _, ...safeUser } = user;
    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: "Login after register failed" });
      res.status(201).json(safeUser);
    });
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
    res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/auth/login", (req, res, next) => {
  try {
    loginSchema.parse(req.body);
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
  }
  passport.authenticate("local", (err: any, user: User | false, info: any) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    });
  })(req, res, next);
});

router.post("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ message: "Logged out successfully" });
  });
});

router.get("/auth/me", requireAuth, (req, res) => {
  const { password: _, ...safeUser } = req.user as User;
  res.json(safeUser);
});

// Profile endpoints
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await storage.updateUserProfile((req.user as User).id, data);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
    res.status(500).json({ message: "Failed to update profile" });
  }
});

export default router;
