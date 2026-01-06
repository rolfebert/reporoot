"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = authenticateJWT;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const accessSecret = process.env.JWT_ACCESS_SECRET || "devsecret";
function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: { message: "Authorization header missing" } });
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer")
        return res.status(401).json({ error: { message: "Invalid auth header" } });
    const token = parts[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, accessSecret);
        req.user = { id: Number(payload.sub), email: payload.email };
        next();
    }
    catch (err) {
        return res.status(401).json({ error: { message: "Invalid or expired token" } });
    }
}
