import { NextResponse } from "next/server";
import { openAutomationFolder } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function POST() {
  await openAutomationFolder();
  return NextResponse.json({ opened: true });
}
