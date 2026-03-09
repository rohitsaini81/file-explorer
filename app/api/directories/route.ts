import { NextResponse } from "next/server";
import { listDirectories } from "@/lib/files-db";
import { directoriesTable } from "@/lib/mock-db";
import { isMockFallbackEnabled } from "@/lib/mock-fallback";

export async function GET() {
  const allowMockFallback = isMockFallbackEnabled();
  try {
    const directories = await listDirectories();
    console.log("[api/directories] returned", directories.length, "rows");
    return NextResponse.json({
      data: directories,
    });
  } catch (error) {
    if (allowMockFallback) {
      console.error("[api/directories] falling back to mock data", error);
      return NextResponse.json({
        data: directoriesTable,
      });
    }

    console.error("[api/directories] database read failed", error);
    return NextResponse.json(
      { error: "Unable to load directories from persistent storage" },
      { status: 500 }
    );
  }
}
