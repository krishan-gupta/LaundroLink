import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware";
import { startSessionSchema, type User } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const sessions = await storage.getUserSessions((req.user as User).id);
    res.json(sessions);
  } catch {
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
});

router.get("/active", requireAuth, async (req, res) => {
  try {
    const sessions = await storage.getActiveSessions((req.user as User).id);
    res.json(sessions);
  } catch {
    res.status(500).json({ message: "Failed to fetch active sessions" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { machineId } = startSessionSchema.parse(req.body);
    const session = await storage.startSession((req.user as User).id, machineId);
    res.status(201).json(session);
  } catch (err: any) {
    if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
    res.status(400).json({ message: err.message || "Failed to start session" });
  }
});

router.patch("/:id/complete", requireAuth, async (req, res) => {
  try {
    const session = await storage.completeSession(req.params.id as string);
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json(session);
  } catch {
    res.status(500).json({ message: "Failed to complete session" });
  }
});

router.patch("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const session = await storage.cancelSession(req.params.id as string, (req.user as User).id);
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json(session);
  } catch {
    res.status(500).json({ message: "Failed to cancel session" });
  }
});

export default router;
