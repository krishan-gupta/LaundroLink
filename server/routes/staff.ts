import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireStaff } from "../middleware";
import { type User } from "@shared/schema";

const router = Router();

router.get("/student/workflow", requireAuth, async (req, res) => {
  try {
    const user = req.user as User;
    const workflow = await storage.getWorkflowByUserId(user.id);
    res.set("Cache-Control", "no-store");
    res.json(workflow ? {
      status: workflow.status,
      bagId: workflow.bag_id,
      updatedAt: workflow.updated_at,
    } : null);
  } catch {
    res.status(500).json({ message: "Failed to fetch workflow" });
  }
});

router.get("/student/queue-position", requireAuth, async (req, res) => {
  try {
    const user = req.user as User;
    const position = await storage.getQueuePosition(user.id);
    res.json(position);
  } catch {
    res.status(500).json({ message: "Failed to fetch queue position" });
  }
});

router.get("/staff/student/:username", requireStaff, async (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username as string).trim();
    const student = await storage.getStudentByUsername(username);
    if (!student) return res.status(404).json({ message: "Student not found", scanned: username });
    const workflow = await storage.getWorkflowByUserId(student.id);
    res.json({
      id: student.id,
      username: student.username,
      displayName: student.displayName,
      email: student.email,
      workflow: workflow ? {
        status: workflow.status,
        bagId: workflow.bag_id,
        updatedAt: workflow.updated_at,
      } : null,
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch student" });
  }
});

router.put("/staff/student/:username/status", requireStaff, async (req, res) => {
  try {
    const { status, bagId } = req.body;
    const validStatuses = ["hand_in", "washing", "ready_for_pickup", "delivered"];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: "Invalid status" });
    const student = await storage.getStudentByUsername(req.params.username as string);
    if (!student) return res.status(404).json({ message: "Student not found" });
    const workflow = await storage.upsertWorkflow(student.id, status, bagId);
    
    const statusLabels: Record<string, string> = {
      hand_in: "Your laundry has been handed in.",
      washing: "Your laundry is now being washed.",
      ready_for_pickup: "Your laundry is ready for pickup!",
      delivered: "Your laundry has been delivered.",
    };
    await storage.createNotification(student.id, {
      title: "Laundry status updated",
      message: statusLabels[status],
      type: status === "ready_for_pickup" || status === "delivered" ? "success" : "info",
    });
    res.json({ status: workflow.status, bagId: workflow.bag_id, updatedAt: workflow.updated_at });
  } catch {
    res.status(500).json({ message: "Failed to update status" });
  }
});

export default router;
