import { NextResponse } from "next/server";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(properties).where(eq(properties.orgId, s.orgId));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, address } = await req.json();
  if (!name) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  const [row] = await db.insert(properties).values({ orgId: s.orgId, name, address }).returning();
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  await db.delete(properties).where(and(eq(properties.id, id), eq(properties.orgId, s.orgId)));
  return NextResponse.json({ ok: true });
}
