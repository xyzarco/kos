import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, tenancies, residents } from "@/db/schema";
import { waOutbox } from "@/db/extra";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";

// Reminder WA mode simulasi: pesan disimpan ke wa_outbox, belum dikirim beneran.
const TEMPLATES = {
  tagihan: (v: Record<string, string>) =>
    `Halo ${v.nama}, tagihan ${v.kost} periode ${v.periode} sebesar ${v.jumlah} (jatuh tempo ${v.tanggal}). Bayar di: ${v.link}`,
  pengingat: (v: Record<string, string>) =>
    `Pengingat: tagihan kost ${v.jumlah} jatuh tempo ${v.tanggal}. Bayar di: ${v.link}`,
  diterima: (v: Record<string, string>) =>
    `Terima kasih, pembayaran ${v.jumlah} diterima. Kuitansi: ${v.link}`,
};

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { invoiceId, template } = await req.json();
  if (!invoiceId || !TEMPLATES[template as keyof typeof TEMPLATES]) {
    return NextResponse.json({ error: "invoiceId & template (tagihan|pengingat|diterima) wajib" }, { status: 400 });
  }

  const [row] = await db
    .select({ inv: invoices, resident: residents })
    .from(invoices)
    .innerJoin(tenancies, eq(invoices.tenancyId, tenancies.id))
    .innerJoin(residents, eq(tenancies.residentId, residents.id))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, s.orgId)))
    .limit(1);
  if (!row) return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });

  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, row.inv.id));
  const t = TEMPLATES[template as keyof typeof TEMPLATES]({
    nama: row.resident.name,
    kost: s.orgName,
    periode: row.inv.period,
    jumlah: "Rp " + row.inv.total.toLocaleString("id-ID"),
    tanggal: row.inv.dueDate,
    link: `${new URL(req.url).origin}/pay/${row.inv.publicToken}`,
  });
  void items;

  const [log] = await db.insert(waOutbox).values({
    orgId: s.orgId, toNumber: row.resident.waNumber,
    template, body: t, status: "simulated",
  }).returning();
  return NextResponse.json(log, { status: 201 });
}

export async function GET() {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(waOutbox).where(eq(waOutbox.orgId, s.orgId));
  return NextResponse.json(rows);
}
