import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { invoices, invoiceItems, tenancies, rooms, residents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { createPayment } from "@/lib/payment";

const periodOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export async function GET() {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select({
      id: invoices.id, period: invoices.period, dueDate: invoices.dueDate,
      total: invoices.total, paidAmount: invoices.paidAmount, status: invoices.status,
      paymentLink: invoices.paymentLink, publicToken: invoices.publicToken,
      residentName: residents.name, roomCode: rooms.code,
    })
    .from(invoices)
    .innerJoin(tenancies, eq(invoices.tenancyId, tenancies.id))
    .innerJoin(residents, eq(tenancies.residentId, residents.id))
    .innerJoin(rooms, eq(tenancies.roomId, rooms.id))
    .where(eq(invoices.orgId, s.orgId));
  return NextResponse.json(rows);
}

// Buat tagihan: { tenancyId, period?: "YYYY-MM", dueDate?: "YYYY-MM-DD", extras?: [{description, amount, type}] }
export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.tenancyId) return NextResponse.json({ error: "tenancyId wajib" }, { status: 400 });

  const [tenancy] = await db
    .select().from(tenancies)
    .where(and(eq(tenancies.id, body.tenancyId), eq(tenancies.orgId, s.orgId)))
    .limit(1);
  if (!tenancy) return NextResponse.json({ error: "Kontrak tidak ditemukan" }, { status: 404 });

  const now = new Date();
  const period: string = body.period ?? periodOf(now);
  const dueDate: string = body.dueDate ?? new Date(now.getFullYear(), now.getMonth(), tenancy.billingDay).toISOString().slice(0, 10);

  const extras: { description: string; amount: number; type: string }[] = Array.isArray(body.extras) ? body.extras : [];
  const total = tenancy.rentAmount + extras.reduce((a: number, e: { amount: number }) => a + (Number(e.amount) || 0), 0);
  const publicToken = randomBytes(24).toString("base64url");

  const [inv] = await db.insert(invoices).values({
    orgId: s.orgId, tenancyId: tenancy.id, period, dueDate, total, status: "terbit", publicToken,
  }).returning();

  const items = [
    { invoiceId: inv.id, description: `Sewa kamar periode ${period}`, amount: tenancy.rentAmount, type: "sewa" as const },
    ...extras.map((e: { description: string; amount: number; type?: string }) => ({
      invoiceId: inv.id,
      description: e.description,
      amount: Number(e.amount) || 0,
      type: (["listrik", "air", "denda", "lain"].includes(e.type ?? "") ? e.type : "lain") as "listrik" | "air" | "denda" | "lain",
    })),
  ];
  await db.insert(invoiceItems).values(items);

  // Buat link pembayaran di gateway
  try {
    const pay = await createPayment({
      orderId: `INV-${inv.id.slice(0, 8).toUpperCase()}-${period}`,
      amount: total,
      successUrl: `${process.env.PUBLIC_BASE_URL}/pay/${publicToken}?status=success`,
      cancelUrl: `${process.env.PUBLIC_BASE_URL}/pay/${publicToken}?status=cancel`,
    });
    await db.update(invoices).set({ paymentLink: pay.payment_link_url }).where(eq(invoices.id, inv.id));
  } catch (err) {
    // tagihan tetap terbit; link bisa dibuat ulang nanti
    console.error("gateway error", err);
  }

  return NextResponse.json(inv, { status: 201 });
}
