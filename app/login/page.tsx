"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", orgName: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "login"
        ? { email: form.email, password: form.password }
        : form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Terjadi kesalahan"); return; }
    router.replace("/dashboard");
  }

  const input = "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-xl font-bold text-white">K</div>
          <h1 className="text-xl font-semibold text-zinc-900">Kost Digital</h1>
          <p className="mt-1 text-sm text-zinc-500">Tagihan & reminder WhatsApp untuk pemilik kost</p>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          {mode === "register" && (
            <>
              <input className={input} placeholder="Nama Anda" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
              <input className={input} placeholder="Nama kost" value={form.orgName}
                onChange={e => setForm({ ...form, orgName: e.target.value })} required />
            </>
          )}
          <input className={input} type="email" placeholder="Email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} required />
          <input className={input} type="password" placeholder="Password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="min-h-12 w-full rounded-xl bg-teal-700 font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-50">
            {busy ? "Memproses…" : mode === "login" ? "Masuk" : "Daftar"}
          </button>
          <p className="pt-1 text-center text-sm text-zinc-500">
            {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
            <button type="button" className="font-medium text-teal-700 underline-offset-2 hover:underline"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
              {mode === "login" ? "Daftar" : "Masuk"}
            </button>
          </p>
        </form>
      </div>
    </main>
  );
}
