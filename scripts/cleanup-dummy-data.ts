import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import fs from "fs";
import path from "path";

async function cleanupDummyData() {
  console.log("Starting PMS Database & Storage Cleanup...");

  // Find the owner user
  const owner = await prisma.users.findFirst({
    where: {
      OR: [
        { role: "owner" },
        { email: "owner@kairalibooks.in" },
      ],
    },
  });

  if (!owner) {
    throw new Error("CRITICAL: Owner user not found in the database. Aborting cleanup.");
  }

  console.log(`Found Owner User: ${owner.name} (${owner.email}) [ID: ${owner.id}]`);

  // Execute deletion in order of relational dependencies
  await prisma.$transaction(async (tx) => {
    console.log("1. Deleting production_projects...");
    const pp = await tx.production_projects.deleteMany({});
    console.log(`   Deleted ${pp.count} production_projects`);

    console.log("2. Deleting stock_movements...");
    const sm = await tx.stock_movements.deleteMany({});
    console.log(`   Deleted ${sm.count} stock_movements`);

    console.log("3. Deleting sale_lines...");
    const sl = await tx.sale_lines.deleteMany({});
    console.log(`   Deleted ${sl.count} sale_lines`);

    console.log("4. Deleting sales...");
    await tx.sales.updateMany({ data: { return_of_sale_id: null } });
    const s = await tx.sales.deleteMany({});
    console.log(`   Deleted ${s.count} sales`);

    console.log("5. Deleting print_jobs...");
    const pj = await tx.print_jobs.deleteMany({});
    console.log(`   Deleted ${pj.count} print_jobs`);

    console.log("6. Deleting contracts...");
    const c = await tx.contracts.deleteMany({});
    console.log(`   Deleted ${c.count} contracts`);

    console.log("7. Deleting payouts...");
    const p = await tx.payouts.deleteMany({});
    console.log(`   Deleted ${p.count} payouts`);

    console.log("8. Deleting titles...");
    await tx.titles.updateMany({ data: { parent_title_id: null } });
    const t = await tx.titles.deleteMany({});
    console.log(`   Deleted ${t.count} titles`);

    console.log("9. Deleting authors...");
    const a = await tx.authors.deleteMany({});
    console.log(`   Deleted ${a.count} authors`);

    console.log("10. Deleting submissions...");
    const sub = await tx.submissions.deleteMany({});
    console.log(`    Deleted ${sub.count} submissions`);

    console.log("11. Deleting dealers...");
    const d = await tx.dealers.deleteMany({});
    console.log(`    Deleted ${d.count} dealers`);

    console.log("12. Deleting email_outbox...");
    const eo = await tx.email_outbox.deleteMany({});
    console.log(`    Deleted ${eo.count} email_outbox records`);

    console.log("13. Deleting submission_throttle & login_attempts...");
    const st = await tx.submission_throttle.deleteMany({});
    const la = await tx.login_attempts.deleteMany({});
    console.log(`    Deleted ${st.count} throttle entries, ${la.count} login attempts`);

    console.log("14. Deleting audit_log...");
    const al = await tx.audit_log.deleteMany({});
    console.log(`    Deleted ${al.count} audit logs`);

    console.log("15. Cleaning sessions (except owner)...");
    const sess = await tx.sessions.deleteMany({
      where: {
        user_id: { not: owner.id },
      },
    });
    console.log(`    Deleted ${sess.count} non-owner sessions`);

    console.log("16. Resetting settings updated_by to owner or null...");
    await tx.settings.updateMany({
      data: { updated_by: null },
    });

    console.log("17. Deleting all non-owner users...");
    const u = await tx.users.deleteMany({
      where: {
        id: { not: owner.id },
      },
    });
    console.log(`    Deleted ${u.count} dummy users`);

    console.log("18. Resetting counters to 0...");
    await tx.counters.deleteMany({});
    console.log("    Counters reset.");
  });

  // Storage cleanup: delete uploaded files in storage/submissions/
  const storageDir = path.resolve(process.cwd(), "storage/submissions");
  if (fs.existsSync(storageDir)) {
    console.log("19. Cleaning storage/submissions/ directory...");
    const files = fs.readdirSync(storageDir, { recursive: true });
    let deletedFiles = 0;
    for (const file of files) {
      const filePath = path.join(storageDir, String(file));
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile() && !file.toString().endsWith(".gitkeep")) {
        fs.unlinkSync(filePath);
        deletedFiles++;
      }
    }
    console.log(`    Deleted ${deletedFiles} uploaded dummy files.`);
  }

  console.log("\n==========================================");
  console.log("DATABASE CLEANUP COMPLETED SUCCESSFULLY!");
  console.log(`Only Owner User preserved: ${owner.name} (${owner.email})`);
  console.log("==========================================");
}

cleanupDummyData()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
