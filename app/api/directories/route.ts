import { NextResponse } from "next/server";
import { listDirectories } from "@/lib/files-db";
import { directoriesTable } from "@/lib/mock-db";

export async function GET() {
  try {
    const directories = await listDirectories();
    console.log("[api/directories] returned", directories.length, "rows");
    return NextResponse.json({
      data: directories,
    });
  } catch (error) {
    console.error("[api/directories] falling back to mock data", error);
    return NextResponse.json({
      data: directoriesTable,
    });
  }
}
