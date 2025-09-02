// app/app/properties/[propertyId]/rooms/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddRoomForm from "./add-room-form";

type Room = {
  id: string;
  name: string;
  property_id: string;
  room_type_id: string | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function RoomsPage({ params }: { params: { propertyId: string } }) {
  const supabase = createClient();

  // Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const propertyId = params.propertyId;

  // Verify property
  const { data: property, error: propErr } = await supabase
    .from("properties")
    .select("id,name")
    .eq("id", propertyId)
    .single();

  if (propErr || !property) {
    notFound();
  }

  // Rooms list
  const { data: roomsData, error } = await supabase
    .from("rooms")
    .select("id,name,property_id,room_type_id")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>{property.name} — Rooms</h1>
        <p>Error loading rooms: {error.message}</p>
        <p>
          <Link href="/app">← Back to properties</Link>
        </p>
      </main>
    );
  }

  const rooms: Room[] = (roomsData ?? []) as Room[];

  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>{property.name} — Rooms</h1>
        <Link href="/app" style={{ textDecoration: "underline" }}>
          ← Back to properties
        </Link>
      </header>

      <section>
        <h3>Rooms list</h3>
        {rooms.length === 0 && <p>No rooms yet.</p>}
        {rooms.length > 0 && (
          <ul style={{ display: "grid", gap: 8, paddingLeft: 0, listStyle: "none" }}>
            {rooms.map((r) => (
              <li
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  background: "var(--panel)",
                }}
              >
                <div style={{ display: "grid" }}>
                  <strong>{r.name}</strong>
                  <small style={{ color: "var(--muted)" }}>
                    {r.room_type_id ? `Type: ${r.room_type_id}` : "Type: —"}
                  </small>
                </div>

                {/* Replace href with your edit page if available */}
                <Link
                  href="#"
                  style={{
                    border: "1px solid var(--border)",
                    padding: "6px 10px",
                    borderRadius: 8,
                    textDecoration: "none",
                  }}
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Add room</h3>
        <AddRoomForm propertyId={propertyId} />
      </section>
    </main>
  );
}