import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "owner@cyberaudio.local" },
    update: {
      nickname: "Operator"
    },
    create: {
      email: "owner@cyberaudio.local",
      nickname: "Operator"
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
