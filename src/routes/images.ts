import { Router } from 'express';
import prisma from '../db/prisma';
import { AuthRequest, authenticateJWT } from '../middleware/auth';

const router = Router();

router.get('/:id', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    
    const image = await prisma.itemImage.findUnique({
      where: { id },
      select: {
        imageData: true,
        contentType: true,
        fileSize: true,
        url: true,
      },
    });

    if (!image) {
      return res.status(404).json({ error: { message: 'Image not found' } });
    }

    if (image.imageData) {
      res.setHeader('Content-Type', image.contentType || 'image/jpeg');
      res.setHeader('Content-Length', image.fileSize || image.imageData.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      return res.send(image.imageData);
    }

    if (image.url) {
      return res.redirect(image.url);
    }

    return res.status(404).json({ error: { message: 'Image data not available' } });
  } catch (error: any) {
    console.error('Image retrieval error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

router.get('/:id/metadata', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    
    const image = await prisma.itemImage.findUnique({
      where: { id },
      select: {
        id: true,
        imageHash: true,
        contentType: true,
        fileSize: true,
        originalFilename: true,
        analysisData: true,
        label: true,
        imageOrder: true,
        createdAt: true,
      },
    });

    if (!image) {
      return res.status(404).json({ error: { message: 'Image not found' } });
    }

    const metadata = {
      ...image,
      analysisData: image.analysisData ? JSON.parse(image.analysisData) : null,
    };

    res.json({ data: metadata });
  } catch (error: any) {
    console.error('Metadata retrieval error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
});

export default router;