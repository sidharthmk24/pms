import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function inspectDb() {
  const users = await prisma.users.findMany();
  console.log("USERS:", JSON.stringify(users, null, 2));

  const authorsCount = await prisma.authors.count();
  const titlesCount = await prisma.titles.count();
  const contractsCount = await prisma.contracts.count();
  const printJobsCount = await prisma.print_jobs.count();
  const salesCount = await prisma.sales.count();
  const saleLinesCount = await prisma.sale_lines.count();
  const payoutsCount = await prisma.payouts.count();
  const submissionsCount = await prisma.submissions.count();
  const productionProjectsCount = await prisma.production_projects.count();
  const stockMovementsCount = await prisma.stock_movements.count();
  const dealersCount = await prisma.dealers.count();
  const auditCount = await prisma.audit_log.count();
  const emailOutboxCount = await prisma.email_outbox.count();
  const sessionsCount = await prisma.sessions.count();

  console.log({
    authorsCount,
    titlesCount,
    contractsCount,
    printJobsCount,
    salesCount,
    saleLinesCount,
    payoutsCount,
    submissionsCount,
    productionProjectsCount,
    stockMovementsCount,
    dealersCount,
    auditCount,
    emailOutboxCount,
    sessionsCount,
  });
}

inspectDb()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
