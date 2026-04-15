import { PrismaClient } from "@prisma/client";

import { seedDemoData } from "../lib/db/demo";

const prisma = new PrismaClient();

seedDemoData(prisma)
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
