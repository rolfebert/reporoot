"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const sharp_1 = __importDefault(require("sharp"));
const promises_1 = __importDefault(require("fs/promises"));
const imageAnalysis_1 = require("../services/imageAnalysis");
const router = (0, express_1.Router)();
// Store in memory instead of disk to avoid file lock issues
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        }
        else {
            cb(new Error("Only image files are allowed"));
        }
    },
});
// Upload multiple images and analyze in pairs
router.post("/", auth_1.authenticateJWT, upload.array("images", 50), async (req, res) => {
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
            let combinedButtonInfo = {};
            // Process both images in the pair
            for (const file of [file1, file2]) {
                const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
                const optimizedFilename = "opt-" + uniqueSuffix + ".jpg";
                const optimizedPath = path_1.default.join("uploads", optimizedFilename);
                // Process from memory buffer directly to file
                await (0, sharp_1.default)(file.buffer)
                    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
                    .jpeg({ quality: 85 })
                    .toFile(optimizedPath);
                // Analyze the image
                const buttonInfo = await (0, imageAnalysis_1.analyzeButtonImage)(optimizedPath);
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
    }
    catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});
// Delete image
router.delete("/:filename", auth_1.authenticateJWT, async (req, res) => {
    try {
        const { filename } = req.params;
        const filepath = path_1.default.join("uploads", filename);
        await promises_1.default.unlink(filepath);
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});
exports.default = router;
