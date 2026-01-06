import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export interface AuthRequest extends Request {
  user?: { id: number; email: string };
}

const accessSecret = process.env.JWT_ACCESS_SECRET || "devsecret";

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: { message: "Authorization header missing" } });

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return res.status(401).json({ error: { message: "Invalid auth header" } });

  const token = parts[1];
  try {
    const payload = jwt.verify(token, accessSecret) as any;
    req.user = { id: Number(payload.sub), email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: { message: "Invalid or expired token" } });
  }
}