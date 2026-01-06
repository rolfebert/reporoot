import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import itemsRoutes from "./routes/items";
import uploadRoutes from "./routes/upload";
import { authenticateJWT } from "./middleware/auth";

dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "https:", "data:"]
    }
  }
}));
app.use(cors({
  origin: ["http://localhost:4000", "http://localhost:3000"] // restrict in production
}));
app.use(express.json());

// Rate limiting
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120
}));

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/items", authenticateJWT, itemsRoutes);
app.use("/api/v1/upload", authenticateJWT, uploadRoutes);
app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));

// health
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { message: "internal server error" } });
});

export default app;
