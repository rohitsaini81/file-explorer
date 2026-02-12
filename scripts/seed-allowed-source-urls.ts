import { seedAllowedSourceUrls } from "@/lib/files-write";
import { runPsqlFile } from "@/lib/psql";

async function main() {
  const userId = "8199889776";
  const parentId = null;

  await runPsqlFile("db/files_write_functions.sql");
  console.log("Seeding allowedSourceUrls...");
  const rows = await seedAllowedSourceUrls({ userId, parentId });
  console.log(`Inserted ${rows.length} rows.`);
  console.log(rows.map((row) => ({ id: row.id, file_name: row.file_name })));
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
