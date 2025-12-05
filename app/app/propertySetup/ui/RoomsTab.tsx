"use client";

import { useEffect, useMemo, useState } from "react";

type Room = { id: string; name: string; sort_index: number; room_type_id: string | null };
type RoomType = { id: string; name: string };

export default function RoomsTab({
  rooms,
  roomTypes,
  onAddRoom,
  onRenameRoom,
  onDeleteRoom,
  onMoveRoom,
  onAddType,
  onRenameType,
  onDeleteType,
  onAssignType,
  plan,
  roomTypesGuideTick,
}: {
  rooms: Room[];
  roomTypes: RoomType[];
  onAddRoom: () => void | Promise<void>;
  onRenameRoom: (roomId: string, name: string) => void | Promise<void>;
  onDeleteRoom: (roomId: string) => void | Promise<void>;
  onMoveRoom: (roomId: string, dir: "up" | "down") => void | Promise<void>;
  onAddType: (name: string) => void | Promise<void>;
  onRenameType: (typeId: string, name: string) => void | Promise<void>;
  onDeleteType: (typeId: string) => void | Promise<void>;
  onAssignType: (roomId: string, typeId: string | null) => void | Promise<void>;
  plan?: 'basic' | 'standard' | 'premium' | null;
  roomTypesGuideTick?: number;
}) {
  const [newType, setNewType] = useState("");
  const [confirmRoomDel, setConfirmRoomDel] = useState<null | { id: string; name: string }>(null);
  const [roomTypesOpen, setRoomTypesOpen] = useState<boolean>(false);
  const [highlightRoomTypes, setHighlightRoomTypes] = useState<boolean>(false);

  const roomsSorted = useMemo(() => {
    return [...rooms].sort((a, b) => a.sort_index - b.sort_index);
  }, [rooms]);

  const roomLimitReached = false; // Unlimited rooms per property on all plans

  // When guided from Quick setup, open Room types and highlight the add field
  useEffect(() => {
    if (!roomTypesGuideTick) return;
    setRoomTypesOpen(true);
    setHighlightRoomTypes(true);
    const t = setTimeout(() => setHighlightRoomTypes(false), 1200);
    return () => clearTimeout(t);
  }, [roomTypesGuideTick]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Section 1: Room Types */}
      <section className="sb-card" style={{ padding: 12 }}>
        <button
          type="button"
          onClick={() => setRoomTypesOpen((v) => !v)}
          className="sb-btn sb-btn--ghost"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: 0,
            border: "none",
            background: "transparent",
            boxShadow: "none",
            marginBottom: roomTypesOpen ? 8 : 0,
            cursor: "pointer",
          }}
        >
          <strong>Room types</strong>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {roomTypesOpen ? "▲" : "▼"}
          </span>
        </button>

        {roomTypesOpen && (
          <>
            <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>
              {roomTypes.length === 0 && (
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  You don’t have any room types yet.
                </div>
              )}
              <div>
                Use this section only if your property has multiple room types (e.g. Double Room, Studio, Deluxe Suite).
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <input
                placeholder="Add a room type (e.g., Double)"
                value={newType}
                onChange={(e) => setNewType((e.target as HTMLInputElement).value)}
                style={{
                  ...input,
                  ...(highlightRoomTypes
                    ? {
                        borderColor: "var(--primary)",
                        boxShadow:
                          "0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent)",
                      }
                    : null),
                }}
              />
              {newType.trim() && (
                <button
                  onClick={() => {
                    const v = newType.trim();
                    if (v) {
                      onAddType(v);
                      setNewType("");
                    }
                  }}
                  className="sb-btn sb-btn--primary"
                >
                  Add
                </button>
              )}
            </div>

            {roomTypes.length === 0 ? (
              null
            ) : (
              <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
                {roomTypes.map((t) => (
                  <TypeRow key={t.id} type={t} onRename={onRenameType} onDelete={onDeleteType} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* Section 2: Rooms + type assignment */}
      <section className="sb-card" style={{ padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
          <strong>Rooms</strong>
          <button onClick={onAddRoom} className="sb-btn sb-btn--primary">Add room</button>
        </div>

        {roomsSorted.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            <div style={{ color: "var(--danger)" }}>
              You don’t have any rooms defined yet.
            </div>
            <div style={{ marginTop: 4 }}>
              To use Plan4Host properly you need at least one room. Rooms are required in order to:
            </div>
            <ul style={{ marginTop: 4, paddingLeft: 18 }}>
              <li>record and manage bookings</li>
              <li>sync calendars (iCal) with OTAs</li>
              <li>send automatic messages to guests</li>
            </ul>
            <div style={{ marginTop: 6 }}>
              Click “Add room” to create your first room.
            </div>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
            {roomsSorted.map((r, idx) => (
              <li
                key={r.id}
                style={{
                  background: "var(--panel)",
                  borderRadius: 12,
                  padding: 12,
                  gap: 10,
                  overflow: "hidden",
                  alignItems: "center",
                }}
                className="room-row"
              >
                {/* Row 1: NAME (full width) */}
                <div style={{ gridArea: "name", minWidth: 0 }}>
                  <RoomNameField room={r} onRenameRoom={onRenameRoom} />
                </div>

                {/* Row 2 (left): TYPE (only if there are room types defined) */}
                {roomTypes.length > 0 && (
                  <div style={typeArea}>
                    <label style={smallLabel}>Room type</label>
                    <select
                      value={r.room_type_id ?? ""}
                      onChange={(e) => onAssignType(r.id, e.currentTarget.value || null)}
                      className="sb-select"
                      style={{ fontFamily: 'inherit', fontSize: 13 }}
                    >
                      <option value="">— None —</option>
                      {roomTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
               

                {/* Row 2 (right): ACTIONS */}
                <div style={actionsArea}>
                  <button
                    onClick={() => onMoveRoom(r.id, "up")}
                    disabled={idx === 0}
                    className="sb-btn"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => onMoveRoom(r.id, "down")}
                    disabled={idx === roomsSorted.length - 1}
                    className="sb-btn"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => setConfirmRoomDel({ id: r.id, name: r.name })}
                    className="sb-btn"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {confirmRoomDel && (
        <div role="dialog" aria-modal="true" onClick={()=>setConfirmRoomDel(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:120, display:'grid', placeItems:'center', padding:12 }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(520px,100%)', padding:16, border:'1px solid var(--border)', borderRadius:12, background:'var(--panel)', color:'var(--text)' }}>
            <div style={{ display:'grid', gap:8 }}>
              <strong>Delete room</strong>
              <div style={{ color:'var(--muted)' }}>
                Are you sure you want to delete “{confirmRoomDel.name}”? This action is irreversible. 
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:6 }}>
                <button className="sb-btn" onClick={()=>setConfirmRoomDel(null)}>Close</button>
                <button className="sb-btn sb-btn--primary" onClick={()=>{ const id=confirmRoomDel.id; setConfirmRoomDel(null); onDeleteRoom(id); }} style={{ background:'var(--danger)', color:'#fff', border:'1px solid var(--danger)' }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomNameField({ room, onRenameRoom }: { room: Room; onRenameRoom: (roomId: string, name: string) => void | Promise<void> }) {
  const [name, setName] = useState<string>(room.name);

  // Re-sync when parent updates the room
  useMemo(() => { setName(room.name); }, [room.id, room.name]);

  const commit = () => {
    const v = name.trim();
    if (v && v !== room.name) onRenameRoom(room.id, v);
  };

  return (
    <input
      value={name}
      onChange={(e) => setName((e.target as HTMLInputElement).value)}
      onBlur={commit}
      placeholder="Room name"
      style={input}
    />
  );
}

function TypeRow({
  type,
  onRename,
  onDelete,
}: {
  type: RoomType;
  onRename: (id: string, name: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(type.name);
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <li className="sb-card" style={{ display: "grid", gap: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          {editing ? (
            <input value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} style={input} />
          ) : (
            <strong>{type.name}</strong>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {editing ? (
            <>
              <button
                onClick={() => {
                  const v = name.trim();
                  if (v && v !== type.name) onRename(type.id, v);
                  setEditing(false);
                }}
                className="sb-btn sb-btn--primary"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setName(type.name);
                  setEditing(false);
                }}
                className="sb-btn"
              >
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="sb-btn">
              Rename
            </button>
          )}
          <button onClick={() => setConfirmDel(true)} className="sb-btn">Delete</button>
        </div>
      </div>

      {confirmDel && (
        <div role="dialog" aria-modal="true" onClick={()=>setConfirmDel(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:120, display:'grid', placeItems:'center', padding:12 }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(520px,100%)', padding:16, border:'1px solid var(--border)', borderRadius:12, background:'var(--panel)', color:'var(--text)' }}>
            <div style={{ display:'grid', gap:8 }}>
              <strong>Delete room type</strong>
              <div style={{ color:'var(--muted)' }}>
                Are you sure you want to delete “{type.name}”? 
                This action is irreversible.
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:6 }}>
                <button className="sb-btn" onClick={()=>setConfirmDel(false)}>Close</button>
                <button className="sb-btn sb-btn--primary" onClick={()=>{ setConfirmDel(false); onDelete(type.id); }} style={{ background:'var(--danger)', color:'#fff', border:'1px solid var(--danger)' }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

/* ——— layout styles ——— */
const typeArea: React.CSSProperties = {
  gridArea: "type",
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

const actionsArea: React.CSSProperties = {
  gridArea: "actions",
  display: "flex",
  gap: 6,
  justifyContent: "flex-end",
  flexWrap: "wrap",   // acțiunile se pot împacheta pe 2 rânduri la ecrane înguste
};

/* ——— UI styles ——— */
const smallLabel: React.CSSProperties = { fontSize: 12, color: "var(--muted)" };

/* IMPORTANT: input sigur în card */
const input: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  padding: "8px 10px",
  background: "var(--field)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontFamily: 'inherit',
};

const select: React.CSSProperties = {
  boxSizing: "border-box",
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  padding: "6px 10px",
  borderRadius: 8,
  minWidth: 140,
  width: "100%",
  maxWidth: 320,
};

const primaryBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  background: "var(--primary)",
  color: "#0c111b",
  fontWeight: 800,
  cursor: "pointer",
};
const dangerBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--danger)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 700,
  cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 700,
  cursor: "pointer",
};
