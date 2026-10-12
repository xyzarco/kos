import { Suspense } from "react";
import PayInner from "./PayInner";

export default function PayPage(props: PageProps<"/pay/[token]">) {
  return (
    <Suspense fallback={<main className="flex min-h-dvh items-center justify-center text-sm text-zinc-400">Memuat tagihan…</main>}>
      <PayInner {...props} />
    </Suspense>
  );
}
