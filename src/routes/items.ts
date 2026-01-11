import express from "express";
import prisma from "../db/prisma";
import { AuthRequest } from "../middleware/auth";

const router = express.Router();

// Create item with multiple images
router.post("/", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { 
    title, content, imageIds,
    material, size, diameter, color, holes, style, 
    nbsCode, division, section, sectionName, age, backType,
    pictorialSubject, pattern, usageType,
    buttonCondition, manufacturer, notes 
  } = req.body;
  
  if (!title) return res.status(400).json({ error: { message: "title required" } });
  
  // Create the item first
  const item = await prisma.item.create({ 
    data: { 
      title, 
      content,
      material, 
      size, 
      diameter, 
      color,
      holes: holes ? Number(holes) : null,
      style, 
      nbsCode,
      division,
      section: section ? Number(section) : null,
      sectionName,
      age,
      backType,
      pictorialSubject,
      pattern,
      usageType,
      buttonCondition, 
      manufacturer, 
      notes,
      ownerId: userId
    },
    include: { images: true }
  });
  
  // Link uploaded images to this item
  if (imageIds && Array.isArray(imageIds) && imageIds.length > 0) {
    // Update the uploaded images to link them to this item
    await prisma.itemImage.updateMany({
      where: { id: { in: imageIds } },
      data: { itemId: item.id }
    });
    
    // Update image labels and order
    for (let i = 0; i < imageIds.length; i++) {
      await prisma.itemImage.update({
        where: { id: imageIds[i] },
        data: {
          label: i === 0 ? 'front' : i === 1 ? 'back' : `image-${i + 1}`,
          imageOrder: i
        }
      });
    }
  }
  
  // Fetch the item again with linked images
  const itemWithImages = await prisma.item.findUnique({
    where: { id: item.id },
    include: { images: { orderBy: { imageOrder: 'asc' } } }
  });
  
  res.status(201).json({ data: itemWithImages });
});

// List items with images
router.get("/", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const page = Math.max(Number(req.query.page) || 1, 1);
  
  const items = await prisma.item.findMany({
    where: { ownerId: userId },
    include: { images: { orderBy: { imageOrder: 'asc' } } },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" }
  });
  
  res.json({ data: items, meta: { page, limit } });
});

// Get item with images
router.get("/:id", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const id = Number(req.params.id);
  
  const item = await prisma.item.findFirst({ 
    where: { id, ownerId: userId },
    include: { images: { orderBy: { imageOrder: 'asc' } } }
  });
  
  if (!item) return res.status(404).json({ error: { message: "not found" } });
  res.json({ data: item });
});

// Update item
router.patch("/:id", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const id = Number(req.params.id);
  const updateData: any = {};
  
  const allowedFields = [
    'title', 'content', 'material', 'size', 'diameter', 'color', 
    'holes', 'style', 'nbsCode', 'division', 'section', 'sectionName',
    'age', 'backType', 'pictorialSubject', 'pattern', 'usageType',
    'buttonCondition', 'manufacturer', 'notes'
  ];
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = (field === 'holes' || field === 'section') && req.body[field] !== null 
        ? Number(req.body[field]) 
        : req.body[field];
    }
  });
  
  const item = await prisma.item.findFirst({ where: { id, ownerId: userId } });
  if (!item) return res.status(404).json({ error: { message: "not found" } });
  
  const updated = await prisma.item.update({ 
    where: { id }, 
    data: updateData,
    include: { images: true }
  });
  
  res.json({ data: updated });
});

// Delete item (cascade deletes images)
router.delete("/:id", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const id = Number(req.params.id);
  
  const item = await prisma.item.findFirst({ 
    where: { id, ownerId: userId },
    include: { images: true }
  });
  
  if (!item) return res.status(404).json({ error: { message: "not found" } });
  
  await prisma.item.delete({ where: { id } });
  res.status(204).send();
});

export default router;