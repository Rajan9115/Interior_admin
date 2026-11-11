import { PrismaClient, AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function bootstrapOwner() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const displayName = "MAMA INTERIOR Owner";

  if (!email || !password) {
    console.error(
      "Error: ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be configured in environment variables."
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Error: ADMIN_BOOTSTRAP_PASSWORD must be at least 8 characters long.");
    process.exit(1);
  }

  console.log(`Bootstrapping single-owner admin account for: ${email}...`);

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.adminUser.upsert({
    where: { email },
    update: {
      passwordHash,
      isActive: true,
      role: AdminRole.OWNER,
    },
    create: {
      email,
      passwordHash,
      displayName,
      role: AdminRole.OWNER,
      isActive: true,
    },
  });

  console.log(`✓ Owner account verified and ready (User ID: ${user.id}).`);
  console.log("No default credentials committed to source code.");
}

bootstrapOwner()
  .catch((e) => {
    console.error("Failed to bootstrap owner:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

