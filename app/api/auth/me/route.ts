import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(s);
}
