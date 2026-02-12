import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { loadEnvFile } from "@/lib/env";

const execFileAsync = promisify(execFile);

function getDatabaseUrl() {
  loadEnvFile();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  return databaseUrl;
}

export async function runPsql(sql: string, vars: Record<string, string> = {}) {
  const databaseUrl = getDatabaseUrl();
  const args = [
    databaseUrl,
    "-t",
    "-A",
    ...Object.entries(vars).flatMap(([key, value]) => ["-v", `${key}=${value}`]),
    "-c",
    sql,
  ];

  const { stdout } = await execFileAsync("psql", args, {
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  return stdout.trim();
}

export async function runPsqlFile(filePath: string) {
  const databaseUrl = getDatabaseUrl();
  const args = [databaseUrl, "-f", filePath];
  await execFileAsync("psql", args, {
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
