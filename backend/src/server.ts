import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { browserManager } from "./lib/browser-manager";

async function shutdown() {
  await browserManager.shutdown();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

async function main() {
  await prisma.$connect();

  app.listen(env.PORT, () => {
    console.log(`Backend running on http://localhost:${env.PORT}`);
  });
}

main().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
