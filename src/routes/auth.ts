import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import prisma from "../db/prisma";

dotenv.config();

const router = express.Router();

const accessSecret = process.env.JWT_ACCESS_SECRET || "devsecret";
const refreshSecret = process.env.JWT_REFRESH_SECRET || "devrefresh";
const accessTTL = Number(process.env.ACCESS_TOKEN_TTL || 900); // seconds
const refreshTTL = Number(process.env.REFRESH_TOKEN_TTL || 604800); // seconds

function signAccessToken(user: { id: number; email: string }) {
  return jwt.sign(
    { email: user.email },
    accessSecret,
    { subject: String(user.id), expiresIn: accessTTL }
  );
}

function signRefreshToken(user: { id: number; email: string }) {
  return jwt.sign({ email: user.email }, refreshSecret, { subject: String(user.id), expiresIn: refreshTTL });
}

// register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: { message: "email and password required" } });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: { message: "email already in use" } });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash } });

  const accessToken = signAccessToken({ id: user.id, email: user.email });
  const refreshToken = signRefreshToken({ id: user.id, email: user.email });

  await prisma.refreshToken.create({
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
  if (!email || !password) return res.status(400).json({ error: { message: "email and password required" } });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: { message: "invalid credentials" } });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: { message: "invalid credentials" } });

  const accessToken = signAccessToken({ id: user.id, email: user.email });
  const refreshToken = signRefreshToken({ id: user.id, email: user.email });

  await prisma.refreshToken.create({
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
  if (!refreshToken) return res.status(400).json({ error: { message: "refreshToken required" } });

  try {
    const payload = jwt.verify(refreshToken, refreshSecret) as any;
    const tokenRecord = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!tokenRecord) return res.status(401).json({ error: { message: "invalid refresh token" } });

    if (tokenRecord.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      return res.status(401).json({ error: { message: "refresh token expired" } });
    }

    const userId = Number(payload.sub);
    const user = await prisma.user.findUnique({ where: { id: userId }});
    if (!user) return res.status(401).json({ error: { message: "invalid token subject" } });

    // issue new tokens (optionally rotate refresh token)
    const newAccess = jwt.sign({ email: user.email }, accessSecret, { subject: String(user.id), expiresIn: accessTTL });
    const newRefresh = jwt.sign({ email: user.email }, refreshSecret, { subject: String(user.id), expiresIn: refreshTTL });

    // store new refresh token and delete old one
    await prisma.refreshToken.create({
      data: {
        token: newRefresh,
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshTTL * 1000)
      }
    });
    await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });

    res.json({ data: { accessToken: newAccess, refreshToken: newRefresh } });
  } catch (err) {
    return res.status(401).json({ error: { message: "invalid refresh token" } });
  }
});

// logout (revoke refresh token)
router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: { message: "refreshToken required" } });

  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  res.json({ data: { message: "logged out" } });
});

export default router;