import { BusinessMembershipRole, PrismaClient, SystemRole } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const raw = readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadRuntimeEnv() {
  const cwd = process.cwd();
  loadEnvFile(path.join(cwd, ".env"));
  loadEnvFile(path.join(cwd, ".env.local"));
  loadEnvFile(path.join(cwd, ".env.development.local"));

  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
    throw new Error(
      "DATABASE_URL is missing. Set it in your shell or .env.local before running auth:link-clerk-user.",
    );
  }
}

loadRuntimeEnv();

const prisma = new PrismaClient();

type CliArgs = {
  email: string;
  clerkUserId: string;
  businessEmail: string | null;
  systemRole: SystemRole;
  dryRun: boolean;
};

function readFlagValue(flag: string) {
  const index = process.argv.indexOf(flag);

  if (index < 0) {
    return null;
  }

  const value = process.argv[index + 1];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function parseSystemRole(raw: string | null): SystemRole {
  if (!raw) {
    return SystemRole.USER;
  }

  const normalized = raw.trim().toUpperCase();

  if (normalized === SystemRole.USER) {
    return SystemRole.USER;
  }

  if (normalized === SystemRole.ADMIN) {
    return SystemRole.ADMIN;
  }

  if (normalized === SystemRole.SUPER_ADMIN) {
    return SystemRole.SUPER_ADMIN;
  }

  throw new Error(`Unsupported --system-role value: ${raw}`);
}

function parseArgs(): CliArgs {
  const email = readFlagValue("--email")?.toLowerCase() ?? "";
  const clerkUserId = readFlagValue("--clerk-user-id") ?? "";
  const businessEmail = readFlagValue("--business-email")?.toLowerCase() ?? null;
  const systemRole = parseSystemRole(readFlagValue("--system-role"));
  const dryRun = hasFlag("--dry-run");

  if (!email) {
    throw new Error("Missing required --email");
  }

  if (!clerkUserId) {
    throw new Error("Missing required --clerk-user-id");
  }

  if (!clerkUserId.startsWith("user_")) {
    throw new Error("--clerk-user-id must start with user_");
  }

  return {
    email,
    clerkUserId,
    businessEmail,
    systemRole,
    dryRun,
  };
}

async function main() {
  const args = parseArgs();

  const existingByClerkUserId = await prisma.user.findUnique({
    where: { clerkUserId: args.clerkUserId },
    select: { id: true, email: true, clerkUserId: true },
  });

  if (existingByClerkUserId && existingByClerkUserId.email !== args.email) {
    throw new Error(
      `Clerk user ID ${args.clerkUserId} is already linked to ${existingByClerkUserId.email}. Refusing to relink automatically.`,
    );
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email: args.email },
    select: { id: true, email: true, clerkUserId: true, systemRole: true },
  });

  if (existingByEmail?.clerkUserId && existingByEmail.clerkUserId !== args.clerkUserId) {
    throw new Error(
      `User ${args.email} is already linked to ${existingByEmail.clerkUserId}. Refusing to overwrite automatically.`,
    );
  }

  const business = args.businessEmail
    ? await prisma.business.findUnique({
        where: { email: args.businessEmail },
        select: { id: true, email: true, name: true },
      })
    : null;

  if (args.businessEmail && !business) {
    throw new Error(`Business not found for --business-email ${args.businessEmail}`);
  }

  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          wouldLinkUser: {
            email: args.email,
            clerkUserId: args.clerkUserId,
            systemRole: args.systemRole,
          },
          existingByEmail,
          existingByClerkUserId,
          wouldGrantOwnerMembership: business
            ? {
                businessId: business.id,
                businessEmail: business.email,
                businessName: business.name,
                role: BusinessMembershipRole.OWNER,
              }
            : null,
        },
        null,
        2,
      ),
    );
    return;
  }

  const user = await prisma.user.upsert({
    where: { email: args.email },
    update: {
      clerkUserId: args.clerkUserId,
      systemRole: args.systemRole,
    },
    create: {
      email: args.email,
      clerkUserId: args.clerkUserId,
      systemRole: args.systemRole,
    },
    select: {
      id: true,
      email: true,
      clerkUserId: true,
      systemRole: true,
    },
  });

  let membership = null;

  if (business) {
    membership = await prisma.businessMembership.upsert({
      where: {
        userId_businessId: {
          userId: user.id,
          businessId: business.id,
        },
      },
      update: {
        role: BusinessMembershipRole.OWNER,
      },
      create: {
        userId: user.id,
        businessId: business.id,
        role: BusinessMembershipRole.OWNER,
      },
      select: {
        id: true,
        role: true,
        businessId: true,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        dryRun: false,
        linkedUser: user,
        ownerMembership: membership,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
