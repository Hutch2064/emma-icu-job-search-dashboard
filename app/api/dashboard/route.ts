import { NextResponse } from "next/server";
import { readDashboardData } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readDashboardData());
}
