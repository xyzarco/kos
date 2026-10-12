import { NextResponse } from "next/server";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(rooms).where(eq(rooms.orgId, s.orgId));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { propertyId, code, type, basePrice } = await req.json();
  if (!propertyId || !code) return NextResponse.json({ error: "propertyId & code wajib" }, { status: 400 });
  try {
    const [row] = await db.insert(rooms).values({
      orgId: s.orgId, propertyId, code, type: type ?? null,
      basePrice: Number(basePrice) || 0,
    }).returning();
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Kode kamar sudah dipakai di properti ini" }, { status: 409 });
  }
}

export async function PATCH(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status } = await req.json();
  if (!id || !["kosong", "terisi", "perbaikan"].includes(status)) {
    return NextResponse.json({ error: "data tidak valid" }, { status: 400 });
  }
  await db.update(rooms).set({ status }).where(and(eq(rooms.id, id), eq(rooms.orgId, s.orgId)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  await db.delete(rooms).where(and(eq(rooms.id, id), eq(rooms.orgId, s.orgId)));
  return NextResponse.json({ ok: true });
}
