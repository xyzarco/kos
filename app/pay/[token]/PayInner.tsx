import { db } from "@/db";
import { invoices, invoiceItems, tenancies, rooms, residents, payments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

export default async function PayInner({ params, searchParams }: PageProps<"/pay/[token]">) {
  const { token } = await params;
  const [row] = await db
    .select({
      invoice: invoices, residentName: residents.name, waNumber: residents.waNumber,
      roomCode: rooms.code,
    })
    .from(invoices)
    .innerJoin(tenancies, eq(invoices.tenancyId, tenancies.id))
    .innerJoin(residents, eq(tenancies.residentId, residents.id))
    .innerJoin(rooms, eq(tenancies.roomId, rooms.id))
    .where(eq(invoices.publicToken, decodeURIComponent(token)))
    .limit(1);
  if (!row) notFound();

  const inv = row.invoice;
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id));
  const pays = await db.select().from(payments)
    .where(eq(payments.invoiceId, inv.id)).orderBy(desc(payments.createdAt));

  const paid = inv.paidAmount;
  const sisa = Math.max(inv.total - paid, 0);
  const qStatus = (await searchParams).status;
  const badge: Record<string, string> = {
    lunas: "bg-teal-50 text-teal-700", terbit: "bg-amber-50 text-amber-700",
    terlambat: "bg-red-50 text-red-700", sebagian: "bg-blue-50 text-blue-700",
    draft: "bg-zinc-100 text-zinc-600", dibatalkan: "bg-zinc-100 text-zinc-500",
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-zinc-50 px-4 py-8 text-zinc-900">
      <p className="text-center text-xs font-medium uppercase tracking-wider text-zinc-400">Tagihan Kost</p>
      {qStatus === "success" && (
        <div className="mt-3 rounded-xl bg-teal-50 px-4 py-3 text-center text-sm font-medium text-teal-800">
          Pembayaran kamu sedang diproses. Status halaman ini akan otomatis terbarui — refresh kalau perlu.
        </div>
      )}
      {qStatus === "cancel" && (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
          Pembayaran dibatalkan. Kamu bisa coba lagi kapan saja.
        </div>
      )}
      <div className="mt-1 text-center">
        <h1 className="text-lg font-semibold">{row.residentName} · Kamar {row.roomCode}</h1>
        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${badge[inv.status] ?? "bg-zinc-100"}`}>
          {inv.status.toUpperCase()}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-zinc-500">Periode {inv.period}</span>
          <span className="text-xs text-zinc-400">Jatuh tempo {inv.dueDate}</span>
        </div>
        <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{rupiah(sisa)}</p>
        {paid > 0 && <p className="text-xs text-zinc-500">Sudah dibayar {rupiah(paid)} dari {rupiah(inv.total)}</p>}

        <ul className="mt-4 divide-y divide-zinc-100 border-t border-zinc-100 pt-1">
          {items.map(it => (
            <li key={it.id} className="flex justify-between py-2 text-sm">
              <span className="text-zinc-600">{it.description}</span>
              <span className="tabular-nums">{rupiah(it.amount)}</span>
            </li>
          ))}
        </ul>

        {inv.paymentLink && inv.status !== "lunas" && inv.linkStatus !== "expired" && inv.linkStatus !== "cancelled" ? (
          <a href={inv.paymentLink}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-teal-700 font-semibold text-white hover:bg-teal-800">
            Bayar sekarang (QRIS/VA)
          </a>
        ) : inv.status === "lunas" ? (
          <p className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-center text-sm font-medium text-teal-700">
            ✓ Tagihan sudah lunas — terima kasih!
          </p>
        ) : inv.linkStatus === "expired" || inv.linkStatus === "cancelled" ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
            Link pembayaran sebelumnya {inv.linkStatus === "expired" ? "kedaluwarsa" : "dibatalkan"}. Minta pemilik kost membuat link baru.
          </p>
        ) : (
          <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-500">
            Link pembayaran belum tersedia. Hubungi pemilik kost.
          </p>
        )}
      </div>

      {pays.length > 0 && (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-semibold">Riwayat pembayaran</h2>
          <ul className="divide-y divide-zinc-100">
            {pays.map(p => (
              <li key={p.id} className="flex justify-between py-2 text-sm">
                <span className="text-zinc-600">{p.method} · {p.status}</span>
                <span className="tabular-nums">{rupiah(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-zinc-400">Dikirim via Kost Digital</p>
    </main>
  );
}
