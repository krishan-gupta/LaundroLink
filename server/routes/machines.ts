import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireRole } from "../middleware";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  try {
    const list = await storage.getMachines();
    res.json(list);
  } catch {
    res.status(500).json({ message: "Failed to fetch machines" });
  }
});

router.patch("/:id/status", requireRole("staff", "admin"), async (req, res) => {
  try {
    const { status } = req.body;
    const machine = await storage.updateMachineStatus(req.params.id as string, status);
    if (!machine) return res.status(404).json({ message: "Machine not found" });
    res.json(machine);
  } catch {
    res.status(500).json({ message: "Failed to update machine" });
  }
});

export default router;
