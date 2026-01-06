"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("./db/prisma"));
dotenv_1.default.config();
const port = Number(process.env.PORT || 4000);
async function start() {
    try {
        await prisma_1.default.$connect();
        app_1.default.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    }
    catch (err) {
        console.error("Failed to start server", err);
        process.exit(1);
    }
}
start();
