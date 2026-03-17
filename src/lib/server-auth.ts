import { prisma } from "@/lib/prisma";

const OWNER_EMAIL = "owner@cyberaudio.local";
const OWNER_NICKNAME = "Operator";

export async function requireUser() {
  const user = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: {
      email: OWNER_EMAIL,
      nickname: OWNER_NICKNAME
    },
    select: {
      id: true,
      email: true,
      nickname: true
    }
  });

  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname
  };
}
