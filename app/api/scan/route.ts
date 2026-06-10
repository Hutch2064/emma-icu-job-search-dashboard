import { NextResponse } from "next/server";
import { runJobSearch } from "@/lib/search-runner";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(await runJobSearch());
}
