import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin } from "../middleware";

const router = Router();

router.get("/students", requireAdmin, async (_req, res) => {
  try {
    const students = await storage.getAllStudentsWithWorkflow();
    res.json(students);
  } catch { res.status(500).json({ message: "Failed" }); }
});

router.get("/workflows", requireAdmin, async (_req, res) => {
  try {
    const workflows = await storage.getAllWorkflows();
    res.json(workflows);
  } catch { res.status(500).json({ message: "Failed" }); }
});

router.get("/notifications", requireAdmin, async (_req, res) => {
  try {
    const items = await storage.getAllNotifications();
    res.json(items);
  } catch { res.status(500).json({ message: "Failed" }); }
});

router.get("/lost-items", requireAdmin, async (_req, res) => {
  try {
    const items = await storage.getAllLostItems();
    res.json(items);
  } catch { res.status(500).json({ message: "Failed" }); }
});

router.get("/found-items", requireAdmin, async (_req, res) => {
  try {
    const items = await storage.getAllFoundItems();
    res.json(items);
  } catch { res.status(500).json({ message: "Failed" }); }
});

export default router;
