"use client";

import { useEffect, useState } from "react";
import { Building2, BedDouble, Plus, Trash2, DoorOpen, Wrench } from "lucide-react";

type Room = { id: string; code: string; type: string | null; basePrice: number; status: string; propertyId: string };
type Property = { id: string; name: string };

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const STATUS_STYLE: Record<string, { cls: string; Icon: typeof DoorOpen }> = {
  kosong: { cls: "bg-zinc-100 text-zinc-600", Icon: DoorOpen },
  terisi: { cls: "bg-teal-50 text-teal-700", Icon: BedDouble },
  perbaikan: { cls: "bg-amber-50 text-amber-700", Icon: Wrench },
};

const input = "w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";
const card = "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [props, setProps] = useState<Property[]>([]);
  const [form, setForm] = useState({ propertyId: "", code: "", type: "", basePrice: "" });
  const [newProp, setNewProp] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [r, p] = await Promise.all([
      fetch("/api/rooms").then(r => r.json()),
      fetch("/api/properties").then(r => r.json()),
    ]);
    setRooms(r); setProps(p);
  }
  useEffect(() => { load(); }, []);

  async function addProperty() {
    if (!newProp.trim()) return;
    const res = await fetch("/api/properties", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProp }),
    });
    if (res.ok) { setNewProp(""); load(); }
  }

  async function addRoom(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/rooms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setForm(f => ({ ...f, code: "", type: "", basePrice: "" }));
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus kamar ini?")) return;
    await fetch(`/api/rooms?id=${id}`, { method: "DELETE" });
    load();
  }

  const selectedProp = form.propertyId || props[0]?.id || "";

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="mb-3 flex items-center gap-1.5 font-semibold"><Building2 size={16} className="text-zinc-400" /> Tambah properti</h2>
        <div className="flex gap-2">
          <input className={input} placeholder="Nama properti (mis. Kost Melati)" value={newProp}
            onChange={e => setNewProp(e.target.value)} />
          <button onClick={addProperty} className="flex shrink-0 items-center gap-1 rounded-xl bg-teal-700 px-4 font-semibold text-white hover:bg-teal-800"><Plus size={16} /> Tambah</button>
        </div>
        {props.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {props.map(p => (
              <li key={p.id} className="rounded-full bg-zinc-100 px-3 py-1 text-sm">{p.name}</li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={addRoom} className={card + " space-y-3"}>
        <h2 className="flex items-center gap-1.5 font-semibold"><BedDouble size={16} className="text-zinc-400" /> Tambah kamar</h2>
        {props.length === 0 ? (
          <p className="text-sm text-zinc-500">Tambahkan properti dulu.</p>
        ) : (
          <>
            <select className={input} value={selectedProp}
              onChange={e => setForm({ ...form, propertyId: e.target.value })}>
              {props.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input className={input} placeholder="Kode kamar (A1)" value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })} required />
              <input className={input} type="number" min="0" placeholder="Harga /bulan" value={form.basePrice}
                onChange={e => setForm({ ...form, basePrice: e.target.value })} required />
            </div>
            <input className={input} placeholder="Tipe (mis. AC, kamar mandi dalam)" value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })} />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button className="min-h-12 w-full rounded-xl bg-teal-700 font-semibold text-white hover:bg-teal-800">Simpan kamar</button>
          </>
        )}
      </form>

      <div className={card}>
        <h2 className="mb-2 flex items-center gap-1.5 font-semibold"><DoorOpen size={16} className="text-zinc-400" /> Daftar kamar <span className="text-sm font-normal tabular-nums text-zinc-400">({rooms.length})</span></h2>
        {rooms.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada kamar.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {rooms.map(r => {
              const st = STATUS_STYLE[r.status];
              return (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${st.cls}`}><st.Icon size={16} /></span>
                  <div className="min-w-0">
                    <p className="font-medium">Kamar {r.code}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {props.find(p => p.id === r.propertyId)?.name}{r.type ? ` · ${r.type}` : ""} · {rupiah(r.basePrice)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${st.cls}`}>{r.status}</span>
                  <button onClick={() => remove(r.id)} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600" aria-label={`Hapus kamar ${r.code}`}><Trash2 size={16} /></button>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
