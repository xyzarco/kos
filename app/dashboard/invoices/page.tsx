"use client";

import { useEffect, useState } from "react";

type Invoice = {
  id: string; period: string; dueDate: string; total: number; paidAmount: number;
  status: string; paymentLink: string | null; publicToken: string; linkStatus?: string;
  residentName: string; roomCode: string;
};
type Tenancy = { id: string; roomCode: string; residentName: string; rentAmount: number; status: string };

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const card = "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm";
const input = "rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";
const STATUS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600", terbit: "bg-amber-50 text-amber-700",
  sebagian: "bg-blue-50 text-blue-700", lunas: "bg-teal-50 text-teal-700",
  terlambat: "bg-red-50 text-red-700", dibatalkan: "bg-zinc-100 text-zinc-500",
};

const LINK_STATUS: Record<string, { label: string; cls: string }> = {
  none: { label: "tanpa link", cls: "bg-zinc-100 text-zinc-500" },
  pending: { label: "link aktif · menunggu bayar", cls: "bg-blue-50 text-blue-700" },
  paid: { label: "link terbayar", cls: "bg-teal-50 text-teal-700" },
  expired: { label: "link expired", cls: "bg-red-50 text-red-700" },
  cancelled: { label: "link dibatalkan", cls: "bg-amber-50 text-amber-700" },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [tenancyId, setTenancyId] = useState("");
  const [extras, setExtras] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [i, t] = await Promise.all([
      fetch("/api/invoices").then(r => r.json()),
      fetch("/api/tenancies").then(r => r.json()),
    ]);
    setInvoices(i); setTenancies(t.filter((x: Tenancy) => x.status === "aktif"));
  }
  useEffect(() => { load(); }, []);

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const parsed = extras.split(",").map(s => s.trim()).filter(Boolean).map(desc => {
      const [d, amt] = desc.split(":");
      return { description: d?.trim(), amount: Number(amt) || 0 };
    });
    await fetch("/api/invoices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenancyId, extras: parsed }),
    });
    setBusy(false); setExtras(""); load();
  }

  async function sendWa(id: string, template: string) {
    await fetch("/api/whatsapp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId: id, template }),
    });
    alert("Pesan WA (simulasi) tersimpan di outbox ✓");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={createInvoice} className={card + " space-y-3"}>
        <h2 className="font-semibold">Buat tagihan</h2>
        {tenancies.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada kontrak aktif.</p>
        ) : (
          <>
            <select className={input + " w-full"} value={tenancyId} onChange={e => setTenancyId(e.target.value)} required>
              <option value="">Pilih kontrak…</option>
              {tenancies.map(t => (
                <option key={t.id} value={t.id}>{t.residentName} · Kamar {t.roomCode} · {rupiah(t.rentAmount)}/bln</option>
              ))}
            </select>
            <input className={input + " w-full"} placeholder="Tambahan (opsional): Listrik:50000, Air:20000"
              value={extras} onChange={e => setExtras(e.target.value)} />
            <button disabled={busy} className="min-h-12 w-full rounded-xl bg-teal-700 font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
              {busy ? "Memproses…" : "Terbitkan tagihan + link bayar"}
            </button>
          </>
        )}
      </form>

      <div className={card}>
        <h2 className="mb-2 font-semibold">Daftar tagihan <span className="text-sm font-normal tabular-nums text-zinc-400">({invoices.length})</span></h2>
        {invoices.length === 0 ? <p className="text-sm text-zinc-500">Belum ada tagihan.</p> : (
          <ul className="divide-y divide-zinc-100">
            {invoices.map(inv => (
              <li key={inv.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{inv.residentName} · Kamar {inv.roomCode}</p>
                    <p className="text-xs text-zinc-500">Periode {inv.period} · tempo {inv.dueDate}</p>
                    <p className="text-sm font-medium tabular-nums">{rupiah(inv.total)}{inv.paidAmount > 0 && <span className="text-xs text-zinc-500"> (dibayar {rupiah(inv.paidAmount)})</span>}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS[inv.status]}`}>{inv.status}</span>
                </div>
                {inv.status !== "lunas" && inv.linkStatus && inv.linkStatus !== "none" && (
                  <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${LINK_STATUS[inv.linkStatus]?.cls ?? "bg-zinc-100"}`}>
                    {LINK_STATUS[inv.linkStatus]?.label ?? inv.linkStatus}
                  </span>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                  {inv.paymentLink && (
                    <a href={`/pay/${inv.publicToken}`} target="_blank"
                      className="rounded-lg bg-teal-50 px-2.5 py-1.5 text-teal-700 hover:bg-teal-100">Lihat halaman bayar ↗</a>
                  )}
                  {inv.status !== "lunas" && (inv.linkStatus === "expired" || inv.linkStatus === "cancelled" || inv.linkStatus === "none") && (
                    <button onClick={async () => {
                      const r = await fetch("/api/invoices/relink", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ invoiceId: inv.id }),
                      });
                      const d = await r.json();
                      if (r.ok) { load(); } else { alert(d.error ?? "Gagal"); }
                    }} className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-700 hover:bg-amber-100">
                      Buat link baru
                    </button>
                  )}
                  <button onClick={() => sendWa(inv.id, "tagihan")} className="rounded-lg bg-zinc-100 px-2.5 py-1.5 hover:bg-zinc-200">WA: tagihan terbit</button>
                  <button onClick={() => sendWa(inv.id, "pengingat")} className="rounded-lg bg-zinc-100 px-2.5 py-1.5 hover:bg-zinc-200">WA: pengingat</button>
                  {inv.status === "lunas" && (
                    <button onClick={() => sendWa(inv.id, "diterima")} className="rounded-lg bg-zinc-100 px-2.5 py-1.5 hover:bg-zinc-200">WA: pembayaran diterima</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
