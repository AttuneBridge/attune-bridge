import { BusinessMembershipRole, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

async function main() {
  const dryRun = hasFlag("--dry-run");

  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      email: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let createdUsers = 0;
  let createdMemberships = 0;
  let updatedMemberships = 0;

  for (const business of businesses) {
    if (dryRun) {
      const existingUser = await prisma.user.findUnique({
        where: { email: business.email },
        select: { id: true },
      });

      if (!existingUser) {
        createdUsers += 1;
        createdMemberships += 1;
        continue;
      }

      const existingMembership = await prisma.businessMembership.findUnique({
        where: {
          userId_businessId: {
            userId: existingUser.id,
            businessId: business.id,
          },
        },
        select: { id: true, role: true },
      });

      if (!existingMembership) {
        createdMemberships += 1;
      } else if (existingMembership.role !== BusinessMembershipRole.OWNER) {
        updatedMemberships += 1;
      }

      continue;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: business.email },
      select: { id: true },
    });

    const user =
      existingUser ??
      (await prisma.user.create({
        data: {
          email: business.email,
        },
        select: {
          id: true,
        },
      }));

    if (!existingUser) {
      createdUsers += 1;
    }

    const existingMembership = await prisma.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId: user.id,
          businessId: business.id,
        },
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!existingMembership) {
      await prisma.businessMembership.create({
        data: {
          userId: user.id,
          businessId: business.id,
          role: BusinessMembershipRole.OWNER,
        },
      });
      createdMemberships += 1;
    } else if (existingMembership.role !== BusinessMembershipRole.OWNER) {
      await prisma.businessMembership.update({
        where: { id: existingMembership.id },
        data: {
          role: BusinessMembershipRole.OWNER,
        },
      });
      updatedMemberships += 1;
    }
  }

  console.log(JSON.stringify({ dryRun, businesses: businesses.length, createdUsers, createdMemberships, updatedMemberships }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
