"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("../db/prisma"));
dotenv_1.default.config();
const router = express_1.default.Router();
const accessSecret = process.env.JWT_ACCESS_SECRET || "devsecret";
const refreshSecret = process.env.JWT_REFRESH_SECRET || "devrefresh";
const accessTTL = Number(process.env.ACCESS_TOKEN_TTL || 900); // seconds
const refreshTTL = Number(process.env.REFRESH_TOKEN_TTL || 604800); // seconds
function signAccessToken(user) {
    return jsonwebtoken_1.default.sign({ email: user.email }, accessSecret, { subject: String(user.id), expiresIn: accessTTL });
}
function signRefreshToken(user) {
    return jsonwebtoken_1.default.sign({ email: user.email }, refreshSecret, { subject: String(user.id), expiresIn: refreshTTL });
}
// register
router.post("/register", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: { message: "email and password required" } });
    const existing = await prisma_1.default.user.findUnique({ where: { email } });
    if (existing)
        return res.status(409).json({ error: { message: "email already in use" } });
    const passwordHash = await bcrypt_1.default.hash(password, 12);
    const user = await prisma_1.default.user.create({ data: { email, passwordHash } });
    const accessToken = signAccessToken({ id: user.id, email: user.email });
    const refreshToken = signRefreshToken({ id: user.id, email: user.email });
    await prisma_1.default.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + refreshTTL * 1000)
        }
    });
    res.status(201).json({ data: { accessToken, refreshToken } });
});
// login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: { message: "email and password required" } });
    const user = await prisma_1.default.user.findUnique({ where: { email } });
    if (!user)
        return res.status(401).json({ error: { message: "invalid credentials" } });
    const valid = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!valid)
        return res.status(401).json({ error: { message: "invalid credentials" } });
    const accessToken = signAccessToken({ id: user.id, email: user.email });
    const refreshToken = signRefreshToken({ id: user.id, email: user.email });
    await prisma_1.default.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + refreshTTL * 1000)
        }
    });
    res.json({ data: { accessToken, refreshToken } });
});
// refresh
router.post("/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken)
        return res.status(400).json({ error: { message: "refreshToken required" } });
    try {
        const payload = jsonwebtoken_1.default.verify(refreshToken, refreshSecret);
        const tokenRecord = await prisma_1.default.refreshToken.findUnique({ where: { token: refreshToken } });
        if (!tokenRecord)
            return res.status(401).json({ error: { message: "invalid refresh token" } });
        if (tokenRecord.expiresAt < new Date()) {
            await prisma_1.default.refreshToken.delete({ where: { id: tokenRecord.id } });
            return res.status(401).json({ error: { message: "refresh token expired" } });
        }
        const userId = Number(payload.sub);
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(401).json({ error: { message: "invalid token subject" } });
        // issue new tokens (optionally rotate refresh token)
        const newAccess = jsonwebtoken_1.default.sign({ email: user.email }, accessSecret, { subject: String(user.id), expiresIn: accessTTL });
        const newRefresh = jsonwebtoken_1.default.sign({ email: user.email }, refreshSecret, { subject: String(user.id), expiresIn: refreshTTL });
        // store new refresh token and delete old one
        await prisma_1.default.refreshToken.create({
            data: {
                token: newRefresh,
                userId: user.id,
                expiresAt: new Date(Date.now() + refreshTTL * 1000)
            }
        });
        await prisma_1.default.refreshToken.delete({ where: { id: tokenRecord.id } });
        res.json({ data: { accessToken: newAccess, refreshToken: newRefresh } });
    }
    catch (err) {
        return res.status(401).json({ error: { message: "invalid refresh token" } });
    }
});
// logout (revoke refresh token)
router.post("/logout", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken)
        return res.status(400).json({ error: { message: "refreshToken required" } });
    await prisma_1.default.refreshToken.deleteMany({ where: { token: refreshToken } });
    res.json({ data: { message: "logged out" } });
});
exports.default = router;
