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
const crypto_1 = __importDefault(require("crypto"));
const imageAnalysis_1 = require("../services/imageAnalysis");
const prisma_1 = __importDefault(require("../db/prisma"));
const router = (0, express_1.Router)();
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
            cb(new Error('Only image files are allowed'));
        }
    },
});
function calculateHash(buffer) {
    return crypto_1.default.createHash('sha256').update(buffer).digest('hex');
}
async function processAndStoreImage(fileBuffer, originalFilename) {
    const optimizedBuffer = await (0, sharp_1.default)(fileBuffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    const imageHash = calculateHash(optimizedBuffer);
    const existingImage = await prisma_1.default.itemImage.findUnique({
        where: { imageHash },
    });
    if (existingImage) {
        return {
            id: existingImage.id,
            hash: imageHash,
            isNew: false,
            analysisData: existingImage.analysisData ? JSON.parse(existingImage.analysisData) : null,
        };
    }
    // Create unique temp filename to avoid collisions during concurrent uploads
    const tempPath = path_1.default.join('uploads', `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`);
    await promises_1.default.writeFile(tempPath, optimizedBuffer);
    let analysisData = null;
    try {
        // Perform analysis - this needs the file to exist on disk
        analysisData = await (0, imageAnalysis_1.analyzeButtonImage)(tempPath);
    }
    catch (error) {
        console.error('Image analysis failed:', error);
    }
    // CRITICAL FIX: Delete temp file AFTER analysis completes
    // Previously this was in a finally block which deleted the file
    // before analysis could complete
    try {
        await promises_1.default.unlink(tempPath);
    }
    catch (unlinkError) {
        console.error('Failed to delete temp file:', unlinkError);
        // Don't fail the whole operation if cleanup fails
    }
    const newImage = await prisma_1.default.itemImage.create({
        data: {
            imageData: optimizedBuffer,
            contentType: 'image/jpeg',
            fileSize: optimizedBuffer.length,
            imageHash,
            originalFilename,
            analysisData: analysisData ? JSON.stringify(analysisData) : null,
        },
    });
    return {
        id: newImage.id,
        hash: imageHash,
        isNew: true,
        analysisData,
    };
}
router.post('/', auth_1.authenticateJWT, upload.array('images', 50), async (req, res) => {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({ error: { message: 'No files uploaded' } });
        }
        if (req.files.length % 2 !== 0) {
            return res.status(400).json({ error: { message: 'Please upload an even number of images (pairs of front/back)' } });
        }
        const buttons = [];
        for (let i = 0; i < req.files.length; i += 2) {
            const file1 = req.files[i];
            const file2 = req.files[i + 1];
            const images = [];
            let combinedButtonInfo = {};
            for (const file of [file1, file2]) {
                const result = await processAndStoreImage(file.buffer, file.originalname);
                const buttonInfo = result.analysisData || {};
                for (const key in buttonInfo) {
                    if (buttonInfo[key] && !combinedButtonInfo[key]) {
                        combinedButtonInfo[key] = buttonInfo[key];
                    }
                }
                images.push({
                    id: result.id,
                    hash: result.hash,
                    isDuplicate: !result.isNew,
                    originalFilename: file.originalname,
                });
            }
            buttons.push({
                images,
                buttonInfo: combinedButtonInfo
            });
        }
        // Return image IDs for frontend to use
        const allImageIds = buttons.flatMap(b => b.images.map(img => img.id));
        // Return combined analysis data from all images
        const combinedAnalysis = {};
        buttons.forEach(btn => {
            Object.assign(combinedAnalysis, btn.buttonInfo);
        });
        res.json({
            data: {
                imageIds: allImageIds,
                analysisData: combinedAnalysis,
                count: buttons.length
            }
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: { message: error.message } });
    }
});
router.delete('/:filename', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { filename } = req.params;
        const filepath = path_1.default.join('uploads', filename);
        await promises_1.default.unlink(filepath);
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});
router.delete('/', auth_1.authenticateJWT, async (req, res) => {
    try {
        const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
        const files = await promises_1.default.readdir(uploadsDir);
        let deletedCount = 0;
        for (const file of files) {
            if (!file.startsWith('.')) {
                await promises_1.default.unlink(path_1.default.join(uploadsDir, file));
                deletedCount++;
            }
        }
        res.json({
            success: true,
            filesDeleted: deletedCount,
            message: `Cleared ${deletedCount} files from uploads folder`
        });
    }
    catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});
exports.default = router;
