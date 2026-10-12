import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { createPayment } from "@/lib/payment";

// Regenerasi link bayar untuk tagihan yang link-nya expired/cancelled/kosong.
export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { invoiceId } = await req.json();
  if (!invoiceId) return NextResponse.json({ error: "invoiceId wajib" }, { status: 400 });

  const [inv] = await db.select().from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, s.orgId))).limit(1);
  if (!inv) return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
  if (inv.status === "lunas") return NextResponse.json({ error: "Tagihan sudah lunas" }, { status: 400 });

  const sisa = Math.max(inv.total - inv.paidAmount, 0);
  try {
    const pay = await createPayment({
      orderId: `INV-${inv.id.slice(0, 8).toUpperCase()}-${inv.period}-r${Date.now() % 10000}`,
      amount: sisa,
      successUrl: `${process.env.PUBLIC_BASE_URL}/pay/${inv.publicToken}?status=success`,
      cancelUrl: `${process.env.PUBLIC_BASE_URL}/pay/${inv.publicToken}?status=cancel`,
    });
    await db.update(invoices).set({ paymentLink: pay.payment_link_url, linkStatus: "pending" })
      .where(eq(invoices.id, inv.id));
    return NextResponse.json({ ok: true, link: pay.payment_link_url });
  } catch (err) {
    console.error("gateway error", err);
    return NextResponse.json({ error: "Gagal membuat link pembayaran" }, { status: 502 });
  }
}
