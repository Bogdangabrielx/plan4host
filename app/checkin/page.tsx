// app/checkin/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckinClient from "./ui/CheckinClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Search = { [key: string]: string | string[] | undefined };

export default async function CheckinPage({ searchParams }: { searchParams: Search }) {
  const property = (searchParams["property"] as string | undefined) ?? null;
  const booking  = (searchParams["booking"] as string | undefined) ?? null;

  // dacă nu avem property dar avem booking -> rezolvăm property_id și redirectăm
  if (!property && booking) {
    const supabase = createClient();
    const { data } = await supabase
      .from("bookings")
      .select("property_id")
      .eq("id", booking)
      .maybeSingle();

    const propId = data?.property_id as string | undefined;
    if (propId) {
      const q = new URLSearchParams();
      q.set("property", propId);
      q.set("booking", booking);
      redirect(`/checkin?${q.toString()}`);
    }
  }

  // UI public, simplu
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        color: "var(--text)",
        display: "grid",
        placeItems: "start center",
      }}
    >
      <main style={{ width: "min(860px, calc(100vw - 32px))", padding: 16 }}>
        <CheckinClient />
      </main>
    </div>
  );
}
