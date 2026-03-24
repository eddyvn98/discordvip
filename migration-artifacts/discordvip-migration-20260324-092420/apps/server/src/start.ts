import { env } from "./config.js";
import { logger } from "./lib/logger.js";
import { spawn } from "node:child_process";

async function runScript(script: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["run", script], {
      stdio: "inherit",
      cwd: process.cwd(),
      shell: true,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Script ${script} exited with code ${code ?? "unknown"}`));
    });

    child.on("error", reject);
  });
}

async function main() {
  logger.info("Preparing application startup", {
    appEnv: env.APP_ENV,
    runDbPushOnStart: env.RUN_DB_PUSH_ON_START,
    runDbSeedOnStart: env.RUN_DB_SEED_ON_START,
  });

  await runScript("prisma:generate");

  if (env.RUN_DB_PUSH_ON_START) {
    await runScript("prisma:push");
  }

  if (env.RUN_DB_SEED_ON_START) {
    await runScript("seed");
  }

  await runScript("start");
}

main().catch((error) => {
  logger.error("Startup command failed", { error });
  process.exit(1);
});
