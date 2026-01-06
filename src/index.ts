import app from "./app";
import dotenv from "dotenv";
import prisma from "./db/prisma";

dotenv.config();

const port = Number(process.env.PORT || 4000);

async function start() {
  try {
    await prisma.$connect();
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

start();