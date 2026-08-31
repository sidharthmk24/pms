/**
 * Create a user or reset an existing user's password.
 *   npm run user:set -- <email> <name> <role> <password>
 * Roles: owner | accounts | store | production
 */
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const ROLES = ["owner", "editor", "production", "accounts", "store"];
const [email, name, role, password] = process.argv.slice(2);

if (!email || !name || !role || !password) {
  console.error("Usage: npm run user:set -- <email> <name> <role> <password>");
  process.exit(1);
}
if (!ROLES.includes(role)) {
  console.error(`Invalid role "${role}". Must be one of: ${ROLES.join(", ")}`);
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const stamp = new Date().toISOString().slice(0, 19).replace("T", " ");
const password_hash = await bcrypt.hash(password, 12);
const key = email.trim().toLowerCase();

const user = await prisma.users.upsert({
  where: { email: key },
  create: { id: randomUUID(), email: key, name, role, password_hash, active: true, created_at: stamp },
  update: { name, role, password_hash, active: true },
});

// A password change must not leave old sessions or a lockout in place.
await prisma.sessions.deleteMany({ where: { user_id: user.id } });
await prisma.login_attempts.deleteMany({ where: { email: key } });

console.log(`✓ ${user.email} (${user.role}) ready — existing sessions revoked`);
await prisma.$disconnect();
