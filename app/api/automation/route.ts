import { NextResponse } from "next/server";
import { updateAutomationEnabled } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const body = (await request.json()) as { enabled?: unknown };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  return NextResponse.json(await updateAutomationEnabled(body.enabled));
}
