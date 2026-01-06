import { Router } from "express";
import multer from "multer";
import path from "path";
import { AuthRequest, authenticateJWT } from "../middleware/auth";
import sharp from "sharp";
import fs from "fs/promises";
import { analyzeButtonImage } from "../services/imageAnalysis";

const router = Router();

// Store in memory instead of disk to avoid file lock issues
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Upload multiple images and analyze in pairs
router.post("/", authenticateJWT, upload.array("images", 50), async (req: AuthRequest, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: { message: "No files uploaded" } });
    }

    if (req.files.length % 2 !== 0) {
      return res.status(400).json({ error: { message: "Please upload an even number of images (pairs of front/back)" } });
    }

    const buttons = [];
    
    // Process images in pairs
    for (let i = 0; i < req.files.length; i += 2) {
      const file1 = req.files[i];
      const file2 = req.files[i + 1];
      
      const images = [];
      let combinedButtonInfo: any = {};
      
      // Process both images in the pair
      for (const file of [file1, file2]) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const optimizedFilename = "opt-" + uniqueSuffix + ".jpg";
        const optimizedPath = path.join("uploads", optimizedFilename);
        
        // Process from memory buffer directly to file
        await sharp(file.buffer)
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(optimizedPath);

        // Analyze the image
        const buttonInfo = await analyzeButtonImage(optimizedPath);
        
        // Merge info from both images (first non-null wins)
        for (const key in buttonInfo) {
          if (buttonInfo[key] && !combinedButtonInfo[key]) {
            combinedButtonInfo[key] = buttonInfo[key];
          }
        }

        images.push({
          url: `/uploads/${optimizedFilename}`,
          filename: optimizedFilename
        });
      }
      
      buttons.push({
        images,
        buttonInfo: combinedButtonInfo
      });
    }

    res.json({
      data: {
        buttons,
        count: buttons.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Delete image
router.delete("/:filename", authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join("uploads", filename);
    await fs.unlink(filepath);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Clear all uploads folder
router.delete("/", authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const uploadsDir = path.join(process.cwd(), "uploads");
    const files = await fs.readdir(uploadsDir);
    
    let deletedCount = 0;
    for (const file of files) {
      // Skip .gitkeep or other hidden files
      if (!file.startsWith('.')) {
        await fs.unlink(path.join(uploadsDir, file));
        deletedCount++;
      }
    }
    
    res.json({ 
      success: true, 
      filesDeleted: deletedCount,
      message: `Cleared ${deletedCount} files from uploads folder`
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

export default router;
