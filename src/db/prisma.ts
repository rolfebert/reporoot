import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  // You can tune pool by environment (Prisma uses underlying MySQL driver)
  log: ["error", "warn"]
});

export default prisma;