"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    // You can tune pool by environment (Prisma uses underlying MySQL driver)
    log: ["error", "warn"]
});
exports.default = prisma;
