"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Percent, Users, Wallet, Home, DoorOpen, FileSignature, ArrowRight, Building2 } from "lucide-react";

type Props = {
  properties: { id: string; name: string }[];
  rooms: { id: string; code: string; status: string; basePrice: number; propertyId: string }[];
  residents: { id: string; name: string }[];
  tenancies: { id: string; roomCode: string; residentName: string; rentAmount: number }[];
};

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

export default function DashboardHome({ properties, rooms, residents, tenancies }: Props) {
  const terisi = rooms.filter(r => r.status === "terisi").length;
  const okupansi = rooms.length ? Math.round((terisi / rooms.length) * 100) : 0;
  const potensi = tenancies.reduce((a, t) => a + t.rentAmount, 0);

  const card = "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm";
  const stat = "text-2xl font-semibold tabular-nums tracking-tight";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className={card}>
          <Percent size={16} className="text-teal-700" />
          <p className="mt-1 text-xs text-zinc-500">Okupansi</p>
          <p className={stat}>{okupansi}%</p>
          <p className="mt-0.5 text-xs tabular-nums text-zinc-400">{terisi}/{rooms.length} kamar</p>
        </div>
        <div className={card}>
          <Users size={16} className="text-teal-700" />
          <p className="mt-1 text-xs text-zinc-500">Penghuni</p>
          <p className={stat}>{residents.length}</p>
          <p className="mt-0.5 text-xs text-zinc-400">aktif tercatat</p>
        </div>
        <div className={card}>
          <Wallet size={16} className="text-teal-700" />
          <p className="mt-1 text-xs text-zinc-500">Potensi/bulan</p>
          <p className={stat + " text-teal-700"}>{rupiah(potensi)}</p>
        </div>
      </div>

      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-semibold"><Building2 size={16} className="text-zinc-400" /> Properti</h2>
          <Link href="/dashboard/rooms" className="text-sm font-medium text-teal-700 hover:underline">Kelola kamar →</Link>
        </div>
        {properties.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada properti. Tambahkan lewat menu <Link href="/dashboard/rooms" className="text-teal-700 underline">Kamar</Link>.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {properties.map(p => {
              const rs = rooms.filter(r => r.propertyId === p.id);
              return (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm tabular-nums text-zinc-500">{rs.filter(r => r.status === "terisi").length}/{rs.length} terisi</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={card}>
        <h2 className="mb-3 flex items-center gap-1.5 font-semibold"><FileSignature size={16} className="text-zinc-400" /> Kontrak sewa aktif</h2>
        {tenancies.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada kontrak. Tambahkan di menu <Link href="/dashboard/residents" className="text-teal-700 underline">Penghuni</Link>.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {tenancies.map(t => (
              <li key={t.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-700"><DoorOpen size={15} /></span>
                  <div>
                    <p className="font-medium">{t.residentName}</p>
                    <p className="text-xs text-zinc-500">Kamar {t.roomCode}</p>
                  </div>
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
