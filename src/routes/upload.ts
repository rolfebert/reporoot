import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { AuthRequest, authenticateJWT } from '../middleware/auth';
import sharp from 'sharp';
import fs from 'fs/promises';
import crypto from 'crypto';
import { analyzeButtonImage } from '../services/imageAnalysis';
import prisma from '../db/prisma';

const router = Router();

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
      cb(new Error('Only image files are allowed'));
    }
  },
});

function calculateHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function processAndStoreImage(
  fileBuffer: Buffer,
  originalFilename: string
): Promise<{ id: number; hash: string; isNew: boolean; analysisData?: any }> {
  const optimizedBuffer = await sharp(fileBuffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const imageHash = calculateHash(optimizedBuffer);

  const existingImage = await prisma.itemImage.findUnique({
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

  const tempPath = path.join('uploads', `temp-${Date.now()}.jpg`);
  await fs.writeFile(tempPath, optimizedBuffer);

  let analysisData = null;
  try {
    analysisData = await analyzeButtonImage(tempPath);
  } catch (error) {
    console.error('Image analysis failed:', error);
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }

  const newImage = await prisma.itemImage.create({
    data: {
      imageData: optimizedBuffer,
      contentType: 'image/jpeg',
      fileSize: optimizedBuffer.length,
      imageHash,
      originalFilename,
      analysisData: analysisData ? JSON.stringify(analysisData) : null,
      itemId: 0,
    },
  });

  return {
    id: newImage.id,
    hash: imageHash,
    isNew: true,
    analysisData,
  };
}

router.post('/', authenticateJWT, upload.array('images', 50), async (req: AuthRequest, res) => {
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
      let combinedButtonInfo: any = {};
      
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

    res.json({
      data: {
        buttons,
        count: buttons.length
      }
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

router.delete('/:filename', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join('uploads', filename);
    await fs.unlink(filepath);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.delete('/', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = await fs.readdir(uploadsDir);
    
    let deletedCount = 0;
    for (const file of files) {
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