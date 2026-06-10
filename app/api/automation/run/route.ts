import { NextResponse } from "next/server";
import { startCodexAutomationRun } from "@/lib/manual-automation";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(await startCodexAutomationRun());
}
