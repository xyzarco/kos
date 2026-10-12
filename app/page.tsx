import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

async function HomeInner() {
  const s = await requireSession();
  redirect(s ? "/dashboard" : "/login");
  return null;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}
