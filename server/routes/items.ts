import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware";
import { insertLostItemSchema, insertFoundItemSchema, type User } from "@shared/schema";
import { triggerMatchingForFoundItem, triggerMatchingForLostItem } from "../matching";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

const router = Router();

// Lost Items
router.get("/lost-items", requireAuth, async (req, res) => {
  try {
    const items = await storage.getLostItems((req.user as User).id);
    res.json(items);
  } catch {
    res.status(500).json({ message: "Failed to fetch lost items" });
  }
});

router.post("/lost-items", requireAuth, async (req, res) => {
  try {
    const data = insertLostItemSchema.parse(req.body);
    const item = await storage.createLostItem((req.user as User).id, data);
    res.status(201).json(item);
    triggerMatchingForLostItem(item).catch((e) =>
      console.error("[matching] triggerMatchingForLostItem error:", e)
    );
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
    res.status(500).json({ message: "Failed to report lost item" });
  }
});

// Found Items
router.get("/found-items", requireAuth, async (req, res) => {
  try {
    const user = req.user as User;
    if (user.role === "student") {
      const items = await storage.getMatchedFoundItemsForUser(user.id);
      return res.json(items);
    }
    const items = await storage.getFoundItems();
    res.json(items);
  } catch {
    res.status(500).json({ message: "Failed to fetch found items" });
  }
});

router.post("/found-items", requireAuth, async (req, res) => {
  try {
    const data = insertFoundItemSchema.parse(req.body);
    const item = await storage.createFoundItem((req.user as User).id, data);
    res.status(201).json(item);
    if (item.imageUrl) {
      triggerMatchingForFoundItem(item).catch((e) =>
        console.error("[matching] triggerMatchingForFoundItem error:", e)
      );
    }
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
    res.status(500).json({ message: "Failed to report found item" });
  }
});

router.post("/found-items/:id/claim", requireAuth, async (req, res) => {
  try {
    const item = await storage.claimFoundItem(req.params.id as string, (req.user as User).id);
    if (!item) return res.status(404).json({ message: "Item not found or already claimed" });
    res.json(item);
  } catch {
    res.status(500).json({ message: "Failed to claim item" });
  }
});

export default router;
