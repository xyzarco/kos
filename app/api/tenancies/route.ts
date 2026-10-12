import { NextResponse } from "next/server";
import { db } from "@/db";
import { tenancies, rooms, residents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select({
      id: tenancies.id, startDate: tenancies.startDate, endDate: tenancies.endDate,
      rentAmount: tenancies.rentAmount, billingDay: tenancies.billingDay,
      status: tenancies.status, roomCode: rooms.code, residentName: residents.name,
    })
    .from(tenancies)
    .innerJoin(rooms, eq(tenancies.roomId, rooms.id))
    .innerJoin(residents, eq(tenancies.residentId, residents.id))
    .where(eq(tenancies.orgId, s.orgId));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { roomId, residentId, startDate, rentAmount, billingDay, deposit } = await req.json();
  if (!roomId || !residentId || !startDate || !rentAmount) {
    return NextResponse.json({ error: "Lengkapi data kontrak" }, { status: 400 });
  }
  const [row] = await db.insert(tenancies).values({
    orgId: s.orgId, roomId, residentId, startDate,
    rentAmount: Number(rentAmount), billingDay: Number(billingDay) || 1,
    deposit: Number(deposit) || 0, status: "aktif",
  }).returning();
  // update status kamar jadi terisi
  await db.update(rooms).set({ status: "terisi" })
    .where(and(eq(rooms.id, roomId), eq(rooms.orgId, s.orgId)));
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, endDate } = await req.json();
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  const [row] = await db.update(tenancies).set({ status: "selesai", endDate })
    .where(and(eq(tenancies.id, id), eq(tenancies.orgId, s.orgId))).returning();
  if (row) {
    await db.update(rooms).set({ status: "kosong" })
      .where(and(eq(rooms.id, row.roomId), eq(rooms.orgId, s.orgId)));
  }
  return NextResponse.json({ ok: true });
}
