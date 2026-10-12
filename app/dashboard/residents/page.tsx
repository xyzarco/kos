"use client";

import { useEffect, useState } from "react";

type Resident = { id: string; name: string; waNumber: string; emergencyContact: string | null; waOptInAt: string | null };
type Room = { id: string; code: string; basePrice: number; status: string };
type Tenancy = { id: string; roomCode: string; residentName: string; rentAmount: number; startDate: string; status: string };

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const input = "w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";
const card = "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm";
const label = "mb-1 block text-xs font-medium text-zinc-500";

export default function ResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [form, setForm] = useState({ name: "", waNumber: "", emergencyContact: "", optIn: true });
  const [contract, setContract] = useState({ residentId: "", roomId: "", startDate: "", rentAmount: "", billingDay: "1" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [r, rm, t] = await Promise.all([
      fetch("/api/residents").then(r => r.json()),
      fetch("/api/rooms").then(r => r.json()),
      fetch("/api/tenancies").then(r => r.json()),
    ]);
    setResidents(r); setRooms(rm); setTenancies(t);
  }
  useEffect(() => { load(); }, []);

  async function addResident(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/residents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, optIn: form.optIn }),
    });
    if (res.ok) { setForm({ name: "", waNumber: "", emergencyContact: "", optIn: true }); load(); }
  }

  async function addContract(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/tenancies", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contract),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setContract({ residentId: "", roomId: "", startDate: "", rentAmount: "", billingDay: "1" });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus penghuni ini?")) return;
    await fetch(`/api/residents?id=${id}`, { method: "DELETE" });
    load();
  }

  const kamarKosong = rooms.filter(r => r.status === "kosong");

  return (
    <div className="space-y-4">
      <form onSubmit={addResident} className={card + " space-y-3"}>
        <h2 className="font-semibold">Tambah penghuni</h2>
        <div>
          <span className={label}>Nama</span>
          <input className={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <span className={label}>Nomor WhatsApp</span>
          <input className={input} type="tel" placeholder="08xxxxxxxxxx" value={form.waNumber}
            onChange={e => setForm({ ...form, waNumber: e.target.value })} required />
        </div>
        <div>
          <span className={label}>Kontak darurat (opsional)</span>
          <input className={input} value={form.emergencyContact}
            onChange={e => setForm({ ...form, emergencyContact: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={form.optIn}
            onChange={e => setForm({ ...form, optIn: e.target.checked })} />
          Setuju menerima reminder tagihan via WhatsApp
        </label>
        <button className="min-h-12 w-full rounded-xl bg-teal-700 font-semibold text-white hover:bg-teal-800">Simpan penghuni</button>
      </form>

      <form onSubmit={addContract} className={card + " space-y-3"}>
        <h2 className="font-semibold">Buat kontrak sewa</h2>
        {residents.length === 0 || kamarKosong.length === 0 ? (
          <p className="text-sm text-zinc-500">Butuh minimal 1 penghuni dan 1 kamar berstatus <em>kosong</em>.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className={label}>Penghuni</span>
                <select className={input} value={contract.residentId}
                  onChange={e => setContract({ ...contract, residentId: e.target.value })} required>
                  <option value="">Pilih…</option>
                  {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <span className={label}>Kamar (kosong)</span>
                <select className={input} value={contract.roomId}
                  onChange={e => {
                    const room = kamarKosong.find(r => r.id === e.target.value);
                    setContract({ ...contract, roomId: e.target.value, rentAmount: room ? String(room.basePrice) : "" });
                  }} required>
                  <option value="">Pilih…</option>
                  {kamarKosong.map(r => <option key={r.id} value={r.id}>Kamar {r.code}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className={label}>Mulai</span>
                <input className={input} type="date" value={contract.startDate}
                  onChange={e => setContract({ ...contract, startDate: e.target.value })} required />
              </div>
              <div>
                <span className={label}>Harga/bln</span>
                <input className={input} type="number" min="0" value={contract.rentAmount}
                  onChange={e => setContract({ ...contract, rentAmount: e.target.value })} required />
              </div>
              <div>
                <span className={label}>Tgl tagih</span>
                <input className={input} type="number" min="1" max="28" value={contract.billingDay}
                  onChange={e => setContract({ ...contract, billingDay: e.target.value })} />
              </div>
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button className="min-h-12 w-full rounded-xl bg-teal-700 font-semibold text-white hover:bg-teal-800">Buat kontrak</button>
          </>
        )}
      </form>

      <div className={card}>
        <h2 className="mb-2 font-semibold">Penghuni <span className="text-sm font-normal tabular-nums text-zinc-400">({residents.length})</span></h2>
        {residents.length === 0 ? <p className="text-sm text-zinc-500">Belum ada penghuni.</p> : (
          <ul className="divide-y divide-zinc-100">
            {residents.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-zinc-500">{r.waNumber}{r.waOptInAt ? " · opt-in WA ✓" : ""}</p>
                </div>
                <button onClick={() => remove(r.id)} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600" aria-label={`Hapus ${r.name}`}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={card}>
        <h2 className="mb-2 font-semibold">Kontrak sewa</h2>
        {tenancies.length === 0 ? <p className="text-sm text-zinc-500">Belum ada kontrak.</p> : (
          <ul className="divide-y divide-zinc-100">
            {tenancies.map(t => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{t.residentName} · Kamar {t.roomCode}</p>
                  <p className="text-xs text-zinc-500">Sejak {t.startDate} · tagih tgl {"..."} · {t.status}</p>
                </div>
                <span className="text-sm font-medium tabular-nums">{rupiah(t.rentAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
