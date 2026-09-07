import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }, { schema: "kairali_pms" }),
});

async function main() {
  console.log("=== PMS DATABASE INSPECTION ===");

  const users = await prisma.users.findMany({ select: { id: true, email: true, name: true, role: true, active: true } });
  console.log("\nUsers:");
  console.table(users);

  const authorsCount = await prisma.authors.count();
  const titlesCount = await prisma.titles.count();
  const contractsCount = await prisma.contracts.count();
  const submissionsCount = await prisma.submissions.count();
  const productionCount = await prisma.production_projects.count();
  const printJobsCount = await prisma.print_jobs.count();
  const salesCount = await prisma.sales.count();
  const saleLinesCount = await prisma.sale_lines.count();
  const stockMovesCount = await prisma.stock_movements.count();
  const dealersCount = await prisma.dealers.count();
  const payoutsCount = await prisma.payouts.count();
  const auditLogCount = await prisma.audit_log.count();

  console.table([
    { model: "users", count: users.length },
    { model: "authors", count: authorsCount },
    { model: "titles", count: titlesCount },
    { model: "contracts", count: contractsCount },
    { model: "submissions", count: submissionsCount },
    { model: "production_projects", count: productionCount },
    { model: "print_jobs", count: printJobsCount },
    { model: "sales", count: salesCount },
    { model: "sale_lines", count: saleLinesCount },
    { model: "stock_movements", count: stockMovesCount },
    { model: "dealers", count: dealersCount },
    { model: "payouts", count: payoutsCount },
  ]);

  const counters = await prisma.counters.findMany();
  console.log("\nCounters:", counters);

  const constraints = await prisma.$queryRawUnsafe(`
    SELECT conname, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'kairali_pms' AND c.contype = 'c';
  `);
  const fks = await prisma.$queryRawUnsafe(`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'kairali_pms'
      AND tc.table_name = 'production_projects';
  `);
  console.log("\nProduction Projects FKs:");
  console.table(fks);

  if (titlesCount > 0) {
    const titles = await prisma.titles.findMany({ take: 5, select: { id: true, name: true, language: true, stock: true } });
    console.log("\nSample Titles:");
    console.table(titles);
  }

  if (submissionsCount > 0) {
    const subs = await prisma.submissions.findMany({ take: 5, select: { id: true, ref_no: true, author_name: true, title: true, status: true } });
    console.log("\nSample Submissions:");
    console.table(subs);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
