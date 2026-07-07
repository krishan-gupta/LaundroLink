import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware";
import { type User } from "@shared/schema";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const list = await storage.getNotifications((req.user as User).id);
    res.json(list);
  } catch {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.patch("/read-all", requireAuth, async (req, res) => {
  try {
    await storage.markAllNotificationsRead((req.user as User).id);
    res.json({ message: "All notifications marked as read" });
  } catch {
    res.status(500).json({ message: "Failed to mark notifications as read" });
  }
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const notification = await storage.markNotificationRead(req.params.id as string, (req.user as User).id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json(notification);
  } catch {
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

export default router;
