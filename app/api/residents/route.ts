import { NextResponse } from "next/server";
import { db } from "@/db";
import { residents } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select().from(residents)
    .where(and(eq(residents.orgId, s.orgId), isNull(residents.deletedAt)));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, waNumber, emergencyContact, optIn } = await req.json();
  if (!name || !waNumber) return NextResponse.json({ error: "Nama & nomor WA wajib" }, { status: 400 });
  const [row] = await db.insert(residents).values({
    orgId: s.orgId, name, waNumber, emergencyContact: emergencyContact ?? null,
    waOptInAt: optIn ? new Date() : null,
  }).returning();
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  // soft delete sesuai bagian 8.3 dokumen
  await db.update(residents).set({ deletedAt: new Date() })
    .where(and(eq(residents.id, id), eq(residents.orgId, s.orgId)));
  return NextResponse.json({ ok: true });
}
