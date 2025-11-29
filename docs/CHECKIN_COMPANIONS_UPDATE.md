# Check-in Form — Guest Companions (UI + API) — 2025-11-29

This document summarizes the changes made to the public check‑in form and related backend logic for collecting **guest companions** (additional guests) in a single JSON column, instead of separate columns.

## 1. UI — Check-in form (`app/checkin/ui/CheckinClient.tsx`)

### 1.1 New state

- Added a `Companion` type:
  - `firstName`, `lastName`
  - `birthDate`
  - `citizenship`
  - `residenceCountry`
  - `isMinor`
  - `guardianName`
  - `docType` (`"id_card" | "passport" | ""`)
  - `docSeries`, `docNumber`, `docNationality`
- New state hooks:
  - `guestCount: number` (total guests, including main guest; 1–99, default 1).
  - `companions: Companion[]` (in‑memory array for N‑1 companions).
  - `companionsOpen: boolean` (wizard modal open/closed).
  - `companionsIndex: number` (current step in wizard).
  - `companionsError: string` (validation message).

### 1.2 Localized text additions

Extended `TXT.en` / `TXT.ro` with:

- `totalGuestsLabel`
- `totalGuestsHint(first, last)`
- `editCompanions`
- `companionTitle(current, total)`
- `birthDate`
- `residenceCountry`
- `isMinor`
- `guardianLabel`
- `next`, `back`, `saveAndClose`
- `companionMissing`

### 1.3 Total guests selector

- Shown only after both **First name** and **Last name** of the main guest are non‑empty.
- `select` from `1` to `99`, stored in `guestCount` (default `1`).
- When `guestCount > 1`:
  - Ensures `companions.length === guestCount - 1`, pre‑allocating empty `Companion` objects as needed.
  - Opens the companions wizard (`companionsOpen = true`, `companionsIndex = 0`).
- Below the selector, a hint is rendered using `totalGuestsHint(firstName, lastName)`.
- If `guestCount > 1` and all companions are already filled/valid, a button **Edit companions** reopens the wizard from step 0.

### 1.4 Companions wizard (modal)

- Modal rendered when `companionsOpen && expectedCompanions > 0`.
- For each companion index `i` (0‑based):
  - Title: `companionTitle(currentNumber, totalGuests)` where `currentNumber = i + 2` (because main guest is `#1`).
  - Fields:
    - `First name`, `Last name` (with the same `firstname` / `lastname` icons as main form).
    - `Birth date` (date input).
    - `Citizenship`:
      - `Combobox` over `countries.map(c => c.name)` (same component as main form `Country`/`Nationality`).
    - `Country of residence`:
      - Same `Combobox`, same options.
    - Checkbox **Guest is a minor**:
      - If `isMinor = true`:
        - Only `guardianName` is shown and required; no document fields.
      - If `isMinor = false`:
        - `Document type` (`id_card` / `passport`) with `id` icon.
        - For `id_card`:
          - `Series*`
          - `Number*`
        - For `passport`:
          - `Number*` only.
- Navigation:
  - `Back` / `Next` / `Save & close` buttons (`sb-btn` / `sb-btn--primary`).
  - `Back` disabled when `companionsIndex === 0`.
  - `Next` / `Save & close` validate current companion via `validateCompanion` and show `companionsError` if required fields are missing.
- Validation rules (`validateCompanion`):
  - Always required:
    - `firstName`, `lastName`, `birthDate`, `citizenship`, `residenceCountry`.
  - If `isMinor = true`:
    - `guardianName` required.
    - Document fields are ignored (not required, not sent).
  - If `isMinor = false` (adult):
    - `docType` must be selected.
    - `docNumber` required.
    - If `docType === "id_card"` → `docSeries` required.
    - `docNationality` is not used for companions (kept `null` in payload).
- Error message styling:
  - `companionsError` is displayed as plain red text (no red background), to avoid a heavy alert look:
    - `fontSize: 12`, `color: var(--danger)`, `fontWeight: 700`.

### 1.5 Submit gating

- `canSubmit` now includes:
  - `companionsValid`:
    - true if `guestCount === 1`, or
    - `companions.length === guestCount - 1` and every companion passes `validateCompanion`.
- This means the main **Submit check‑in** button is disabled until:
  - form fields are valid (dates, ID upload, signature, consent, etc.), **and**
  - all companions are fully filled and valid when `guestCount > 1`.

### 1.6 Payload sent to `/api/checkin/submit`

- New field added to `payload` from `CheckinClient`:

```ts
guest_companions: expectedCompanions > 0
  ? companions.slice(0, expectedCompanions).map(c => ({
      first_name: c.firstName.trim(),
      last_name: c.lastName.trim(),
      birth_date: c.birthDate || null,
      citizenship: c.citizenship.trim() || null,
      residence_country: c.residenceCountry.trim() || null,
      is_minor: !!c.isMinor,
      guardian_name: c.isMinor ? (c.guardianName.trim() || null) : null,
      doc_type: c.isMinor ? null : (c.docType || null),
      doc_series: c.isMinor || c.docType !== "id_card" ? null : (c.docSeries.trim() || null),
      doc_number: c.isMinor ? null : (c.docNumber.trim() || null),
      doc_nationality: null,
    }))
  : []
```

> Note: For now `doc_nationality` is always `null` for companions (kept simple; can be extended later).

---

## 2. API — `/api/checkin/submit` (`app/api/checkin/submit/route.ts`)

### 2.1 Body parsing

- The route now reads an optional `guest_companions` field from the JSON body:

```ts
const {
  // ...
  docs,
  // companions
  guest_companions,
} = body ?? {};
```

### 2.2 Attaching to existing bookings (matchedBookingId branch)

- When a booking is already matched (`matchedBookingId`), the `updatePayload` for `public.bookings` is extended:

```ts
const updatePayload: any = {
  guest_first_name: guest_first_name ?? null,
  guest_last_name:  guest_last_name  ?? null,
  guest_email:      email ?? null,
  guest_phone:      phone ?? null,
  guest_address:    [address, city, country].map(v => (v ?? "").trim()).filter(Boolean).join(", ") || null,
  form_submitted_at: new Date().toISOString(),
};
if (matchedIsIcal) updatePayload.source = "ical";
if (Array.isArray(guest_companions)) {
  updatePayload.guest_companions = guest_companions;
}
```

### 2.3 New form booking insert (`form_bookings`)

- In the non‑match branch (`/* FĂRĂ MATCH → creăm "form booking" */`), the `basePayload` inserted into `form_bookings` now includes companions:

```ts
const basePayload: any = {
  property_id,
  room_id: null,
  room_type_id: form_room_type_id ?? null,
  start_date,
  end_date,
  guest_first_name: guest_first_name ?? null,
  guest_last_name:  guest_last_name  ?? null,
  guest_email:      email ?? null,
  guest_phone:      phone ?? null,
  guest_address:    displayAddress,
  guest_city:       city ?? null,
  guest_country:    country ?? null,
  submitted_at: new Date().toISOString(),
  state: 'open',
  ota_provider_hint: mapProviderLabel((body as any)?.ota_provider_hint),
};

if (Array.isArray(guest_companions)) {
  basePayload.guest_companions = guest_companions;
}

const ins = await admin.from("form_bookings").insert(basePayload).select("id").single();
```

- The JSON response now also echoes back `guest_companions` for debugging/inspection:

```ts
return NextResponse.json({
  ok: true,
  id: newId,
  updated_existing_booking: false,
  auto_assigned_room_id: null,
  room_type_id: form_room_type_id ?? null,
  start_date,
  end_date,
  start_time,
  end_time,
  documents_saved,
  guest_companions: Array.isArray(guest_companions) ? guest_companions : [],
});
```

---

## 3. Email confirmation — `/api/checkin/confirm` (`app/api/checkin/confirm/route.ts`)

### 3.1 Loading companions

- When enriching the email data, the route now also reads `guest_companions`:
  - Prefer from `form_bookings` (if `booking_id` matches a form).
  - Fallback to `bookings` if not found on form.

```ts
let guestCompanions: any[] | null = null;

// form_bookings branch
if (Array.isArray((b as any).guest_companions)) {
  guestCompanions = (b as any).guest_companions as any[];
}

// bookings branch (fallback)
if (Array.isArray((b as any).guest_companions) && !guestCompanions) {
  guestCompanions = (b as any).guest_companions as any[];
}
```

### 3.2 `Guest:` line in confirmation email

- Instead of just `Guest: First Last`, the code now builds a `totalGuestsText`:

```ts
const guestFull = [guestFirst, guestLast].filter(Boolean).join(' ').trim() || null;
const companionsCount = Array.isArray(guestCompanions) ? guestCompanions.length : 0;
const totalGuestsText = companionsCount > 0 && guestFull
  ? `${guestFull} + ${companionsCount} guest${companionsCount > 1 ? 's' : ''}`
  : guestFull;
```

- In the HTML email:

```ts
${totalGuestsText ? `
  <div style="display:flex; align-items:center; gap:8px;">
    <img src="${iconGuest}" alt="guest" width="16" height="16"/>
    <strong style="margin-right:6px;">Guest:</strong>
    <span>${escapeHtml(totalGuestsText)}</span>
  </div>` : ''}
```

- In the plaintext fallback:

```ts
if (totalGuestsText) lines.push(`Guest: ${totalGuestsText}`);
```

> The email **does not** list individual companion details, only the main guest and `+ N guests`.

---

## 4. QR page `/r/ci/[id]` — showing companions

### 4.1 Loading from DB

- `app/r/ci/[id]/page.tsx` now derives `companions` from either `form_bookings` or `bookings`:

```ts
const companions: any[] =
  (Array.isArray((form as any)?.guest_companions) ? (form as any).guest_companions :
    Array.isArray((booking as any)?.guest_companions) ? (booking as any).guest_companions : []) as any[];
```

### 4.2 Rendering companions section

- Added a new section after the main guest name:

```tsx
{companions.length > 0 && (
  <>
    <div aria-hidden style={{ width:18 }}>
      <Icon pair={iconPairForForm('firstname')} />
    </div>
    <div style={{ color:'var(--muted)', fontSize:12, fontWeight:800 }}>Companions</div>
    <div>
      <div style={{ display:'grid', gap:6 }}>
        {companions.map((c, idx) => {
          const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || `Guest ${idx+2}`;
          const metaParts: string[] = [];
          if (c.birth_date) metaParts.push(c.birth_date);
          if (c.citizenship) metaParts.push(c.citizenship);
          if (c.residence_country) metaParts.push(c.residence_country);
          return (
            <div key={idx} style={{ fontSize:12 }}>
              <strong>{name}</strong>
              {metaParts.length > 0 && (
                <span style={{ color:'var(--muted)', marginLeft:6 }}>
                  ({metaParts.join(' • ')})
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
    <div style={{ gridColumn:'1 / -1', height:1, background:'var(--border)', margin:'6px 0' }} />
  </>
)}
```

- This gives the property a compact overview of each companion:
  - Name (or `Guest 2`, `Guest 3` if missing), and
  - Optional metadata: birth date, citizenship, country of residence.

---

## 5. DB note

- These changes assume you have added a `guest_companions jsonb` column to both:
  - `public.form_bookings`
  - `public.bookings`

See the accompanying SQL file for the exact `ALTER TABLE` statements used on 2025‑11‑29.

