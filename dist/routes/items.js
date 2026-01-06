"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../db/prisma"));
const router = express_1.default.Router();
// Create item with multiple images
router.post("/", async (req, res) => {
    const userId = req.user.id;
    const { title, content, images, material, size, diameter, color, holes, style, nbsCode, buttonCondition, manufacturer, notes } = req.body;
    if (!title)
        return res.status(400).json({ error: { message: "title required" } });
    const item = await prisma_1.default.item.create({
        data: {
            title, content,
            material, size, diameter, color,
            holes: holes ? Number(holes) : null,
            style, nbsCode, buttonCondition, manufacturer, notes,
            ownerId: userId,
            images: images && Array.isArray(images) ? {
                create: images.map((img, index) => ({
                    url: img.url,
                    label: img.label || (index === 0 ? 'front' : index === 1 ? 'back' : `image-${index + 1}`),
                    imageOrder: index
                }))
            } : undefined
        },
        include: { images: true }
    });
    res.status(201).json({ data: item });
});
// List items with images
router.get("/", async (req, res) => {
    const userId = req.user.id;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const items = await prisma_1.default.item.findMany({
        where: { ownerId: userId },
        include: { images: { orderBy: { imageOrder: 'asc' } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" }
    });
    res.json({ data: items, meta: { page, limit } });
});
// Get item with images
router.get("/:id", async (req, res) => {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const item = await prisma_1.default.item.findFirst({
        where: { id, ownerId: userId },
        include: { images: { orderBy: { imageOrder: 'asc' } } }
    });
    if (!item)
        return res.status(404).json({ error: { message: "not found" } });
    res.json({ data: item });
});
// Update item
router.patch("/:id", async (req, res) => {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const updateData = {};
    const allowedFields = [
        'title', 'content', 'material', 'size', 'diameter', 'color',
        'holes', 'style', 'nbsCode', 'buttonCondition', 'manufacturer', 'notes'
    ];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            updateData[field] = field === 'holes' && req.body[field] !== null
                ? Number(req.body[field])
                : req.body[field];
        }
    });
    const item = await prisma_1.default.item.findFirst({ where: { id, ownerId: userId } });
    if (!item)
        return res.status(404).json({ error: { message: "not found" } });
    const updated = await prisma_1.default.item.update({
        where: { id },
        data: updateData,
        include: { images: true }
    });
    res.json({ data: updated });
});
// Delete item (cascade deletes images)
router.delete("/:id", async (req, res) => {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const item = await prisma_1.default.item.findFirst({
        where: { id, ownerId: userId },
        include: { images: true }
    });
    if (!item)
        return res.status(404).json({ error: { message: "not found" } });
    await prisma_1.default.item.delete({ where: { id } });
    res.status(204).send();
});
exports.default = router;
