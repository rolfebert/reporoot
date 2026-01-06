"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const items_1 = __importDefault(require("./routes/items"));
const upload_1 = __importDefault(require("./routes/upload"));
const auth_2 = require("./middleware/auth");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)({
    origin: ["http://localhost:4000", "http://localhost:3000"] // restrict in production
}));
app.use(express_1.default.json());
// Rate limiting
app.use((0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 120
}));
// API routes
app.use("/api/v1/auth", auth_1.default);
app.use("/api/v1/items", auth_2.authenticateJWT, items_1.default);
app.use("/api/v1/upload", auth_2.authenticateJWT, upload_1.default);
app.use("/uploads", express_1.default.static("uploads"));
app.use(express_1.default.static("public"));
// health
app.get("/health", (req, res) => res.json({ status: "ok" }));
// Global error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: { message: "internal server error" } });
});
exports.default = app;
