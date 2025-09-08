import { createClient } from "@/lib/supabase/server";
import CheckinClient from "./ui/CheckinClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CheckinPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const supabase = createClient();
  const propertyId = (searchParams?.property as string | undefined) || "";

  // Preload minimal property info server side if we want to show the name in title quickly
  let property: { id: string; name: string } | null = null;
  if (propertyId) {
    const { data } = await supabase.from("properties").select("id,name").eq("id", propertyId).maybeSingle();
    if (data) property = { id: data.id as string, name: (data as any).name as string };
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--text)", display: "grid", placeItems: "start center" }}>
      <main style={{ width: "min(720px, 94vw)", padding: 16 }}>
        <CheckinClient initialProperty={property} />
      </main>
    </div>
  );
}

