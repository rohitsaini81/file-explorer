import { NextResponse } from "next/server";
import { listDirectories } from "@/lib/files-db";

export async function GET() {
  const directories = await listDirectories();
  console.log("[api/directories] returned", directories.length, "rows");
  return NextResponse.json({
    data: directories,
  });
}
