import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnvFile(path = ".env") {
  const fullPath = resolve(process.cwd(), path);
  let content = "";

  try {
    content = readFileSync(fullPath, "utf8");
  } catch {
    return;
  }

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
