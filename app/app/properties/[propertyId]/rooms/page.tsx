import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddRoomForm from "./add-room-form";
import RoomItem from "./room-item";

export default async function RoomsPage({ params }: { params: { propertyId: string } }) {
  const supabase = createClient();

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const propertyId = params.propertyId;

  // Verifică proprietatea (RLS asigură izolarea)
  const { data: property } = await supabase
    .from("properties")
    .select("id, name")
    .eq("id", propertyId)
    .single();

  if (!property) {
    notFound();
  }

  // Listează camerele
  const { data: rooms = [], error } = await supabase
    .from("rooms")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>{property.name} — Camere</h1>
        <p>Eroare la citirea camerelor: {error.message}</p>
        <p><Link href="/app">← Înapoi la proprietăți</Link></p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>{property.name} — Camere</h1>
        <Link href="/app" style={{ textDecoration: "underline" }}>← Înapoi la proprietăți</Link>
      </header>

      <section>
        <h3>Listă camere</h3>
        {rooms.length === 0 && <p>Nu există camere încă.</p>}
        <ul style={{ display: "grid", gap: 8, paddingLeft: 18 }}>
          {rooms.map((r: any) => (
            <RoomItem key={r.id} room={r} />
          ))}
        </ul>
      </section>

      <section>
        <h3>Adaugă cameră</h3>
        <AddRoomForm propertyId={propertyId} />
      </section>
    </main>
  );
}
