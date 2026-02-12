import { NextResponse } from "next/server";
import { directoriesTable } from "@/lib/mock-db";

export async function GET() {
  return NextResponse.json({
    data: directoriesTable,
  });
}

