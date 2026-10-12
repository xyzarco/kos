"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, ReceiptText, Users, LogOut, Building2 } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Ringkasan", Icon: LayoutDashboard },
  { href: "/dashboard/invoices", label: "Tagihan", Icon: ReceiptText },
  { href: "/dashboard/residents", label: "Penghuni", Icon: Users },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [org, setOrg] = useState<string | null>(null);
  const [path, setPath] = useState("/dashboard");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => {
      if (!d) { router.replace("/login"); return; }
      setOrg(d.orgName);
    });
    setPath(window.location.pathname);
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const isActive = (href: string) => path.startsWith(href);

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 md:flex">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="px-5 py-5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            <Building2 size={14} /> Kost Digital
          </p>
          <h1 className="mt-0.5 truncate text-lg font-semibold leading-tight">{org ?? "…"}</h1>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {TABS.map(t => (
            <Link
              key={t.href}
              href={t.href}
              onClick={() => setPath(t.href)}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                isActive(t.href) ? "bg-teal-50 text-teal-800" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <t.Icon size={19} strokeWidth={isActive(t.href) ? 2.2 : 1.8} />
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-100 p-3">
          <button onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
            <LogOut size={18} /> Keluar
          </button>
        </div>
      </aside>

      {/* Header — mobile */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              <Building2 size={12} /> Kost Digital
            </p>
            <h1 className="text-base font-semibold leading-tight">{org ?? "…"}</h1>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
            <LogOut size={16} /> Keluar
          </button>
        </header>

        <main className="mx-auto w-full max-w-2xl px-4 py-5 pb-24 md:max-w-4xl md:pb-10 md:pl-6">{children}</main>
      </div>

      {/* Bottom nav — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-3 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden">
        {TABS.map(t => (
          <Link
            key={t.href}
            href={t.href}
            onClick={() => setPath(t.href)}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              path.startsWith(t.href) ? "text-teal-700" : "text-zinc-500"
            }`}
          >
            <t.Icon size={20} strokeWidth={path.startsWith(t.href) ? 2.2 : 1.8} />
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
