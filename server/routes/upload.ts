import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middleware";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPG, and WebP images are allowed"));
  },
});

const router = Router();

router.post("/", requireAuth, upload.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const ext = req.file.mimetype === "image/png" ? ".png"
    : req.file.mimetype === "image/webp" ? ".webp" : ".jpg";
  const newName = req.file.filename + ext;
  const newPath = path.join(UPLOADS_DIR, newName);
  fs.renameSync(req.file.path, newPath);
  res.json({ url: `/uploads/${newName}` });
});

export { UPLOADS_DIR };
export default router;
