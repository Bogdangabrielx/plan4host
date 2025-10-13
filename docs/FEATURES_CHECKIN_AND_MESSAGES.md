# Plan4Host — Check‑in Editor, Public Check‑in, Reservation Messages (RO/EN) și Scheduler

Acest document descrie logică, rute, migrări și fluxuri pentru noile funcționalități implementate:

- Check‑in Editor (upload Regulament, date de contact, poză prezentare) + intrare în meniul Management.
- Check‑in public: card “detalii proprietate + contact” peste imagine, centrat (glass), și detalii la final.
- QR cu logo centrat și colțuri rotunjite (componentă reutilizabilă) + Export PDF.
- Reservation Messages: șabloane multi‑limbă (RO/EN), Scheduler, link unic public r/<token>, carduri cu badge “nou”, cron de trimitere e‑mailuri programate, confirmare cameră → e‑mail de “Reservation confirmation”.

---

## 1) Migrații DB

- `supabase/migrations/2025-10-13_property_profile_contact_image.sql`
  - `properties`: `contact_email`, `contact_phone`, `contact_address`, `presentation_image_url`, `presentation_image_uploaded_at`.
  - Bucket public `property-media` (pentru poze prezentare).

- `supabase/migrations/2025-09-08_property_regulation_pdf.sql`
  - `properties`: `regulation_pdf_*` (PDF Regulament; existent anterior).

- `supabase/migrations/2025-10-13_reservation_template_lang.sql`
  - `reservation_template_blocks`: `lang text not null default 'ro'` (suport pentru RO/EN pe bloc).

- `supabase/migrations/2025-10-13_reservation_template_schedule.sql`
  - `reservation_templates`: `schedule_kind text` (una dintre: `hour_before_checkin`, `on_arrival`, `hours_before_checkout`, `none`), `schedule_offset_hours integer` (ex: 1h înainte de check‑in, 12h înainte de check‑out).

---

## 2) API — rute noi/actualizate (server)

- Upload poză prezentare proprietate: `app/api/property/profile/upload/route.ts`
- Upload PDF Regulament (existent): `app/api/property/regulation/upload/route.ts`
- Public catalog proprietate extins cu contact + imagine: `app/api/public/property-catalog/route.ts`
- Public message page (token) extins:
  - `app/api/reservation-message/public/[token]/route.ts` → returnează:
    - `details` (property_name, guest_first_name/last_name, start_date, end_date, room_name)
    - `items[]` (lista template‑uri publicate: `id, title, schedule_kind, html_ro, html_en, visible`)
- Confirmare cameră → e‑mail de confirmare rezervare + generare token (dacă lipsește):
  - `app/api/reservation-message/confirm-room/route.ts`
- Cron de trimitere mesaje programate (e‑mail):
  - `app/api/reservation-message/cron/dispatch/route.ts`
  - Autorizare: header `x-vercel-cron` (Vercel Cron) sau `?key=CRON_SECRET`.
- Template GET/POST extins cu `lang` și `schedule_*`: `app/api/reservation-message/template/route.ts`

---

## 3) UI — Check‑in Editor și Check‑in public

- Check‑in Editor (Management → “Check-in Editor”):
  - Pagina: `app/app/checkinEditor/page.tsx`
  - Client: `app/app/checkinEditor/ui/CheckinEditorClient.tsx`
  - Ce poți face:
    - Upload / Replace PDF Regulament (folosește endpointul existent)
    - Editare date contact proprietate: email, telefon, adresă
    - Upload / Replace poză de prezentare (bucket `property-media`)
    - Copiere “Check‑in link” (cu popup de selectare sursă: Manual + provideri ical agregați), linkul include `?source=<slug>`

- Check‑in (public): `app/checkin/ui/CheckinClient.tsx`
  - Afișează card “Property info” (imagine prezentare + contact) ca **glass overlay** centrat peste poză; vizibil permanent.
  - Buton “Export as PDF” în pagina `r/ci/[id]` (QR a fost scos); PDF folosește iconurile `*_forlight.png`.
  - Componentă QR refactorizată: `components/QrWithLogo.tsx` (colțuri rotunjite + logo centrat).

- Meniu Management (dreapta) include “Check‑in Editor”: `app/app/ui/AppHeader.tsx`.

---

## 4) UI — Guest Overview (confirmare cameră, link, QR, badge Manual)

- Confirmare cameră (`app/app/guest/ui/GuestOverviewClient.tsx`):
  - La salvare (după validare overlap) → apel automat:
    - `/api/reservation-message/generate` (creează token dacă lipsește)
    - `/api/reservation-message/confirm-room` (trimite e‑mail “Reservation confirmation” cu Guest/Stay/Room + buton spre `r/<token>`)
- “See QR” modal: folosește `QrWithLogo` și linkul este clicabil.
- Badge OTA fallback “Manual” (verde, logo P4H) dacă `ota_provider` lipsește: `app/app/guest/ui/GuestOverviewClient.tsx`.

---

## 5) Reservation Messages — Editor (RO/EN), Scheduler, Publish

- Pagina editor: `app/app/reservationMessage/ui/ReservationMessageClient.tsx`
  - Multi‑template per proprietate (listă, create/delete, pick active). Titlu template unic.
  - Conținut per limbă:
    - RO → `tpl.blocks`
    - EN → `tpl.blocks_en`
  - “Message” are butoane RO/EN (icon `public/ro.png`, `public/eng.png`) pentru a comuta editorul; trecerea face “commit” în limba curentă, fără a suprascrie cealaltă.
  - Scheduler (obligatoriu la Publish):
    - One hour before reservation
    - Once the guest arrives (mapped la **ziua + ora check‑in**) — nu la “confirmare cameră”
    - 12 hours before check out
    - None (nu se afișează pe pagina publică; nu se trimite e‑mail)
  - Stare implicită: `— select —` (ne‑selectat). Save (draft) permite lipsa scheduler‑ului; Publish cere selectare explicită (nu se publică fără o alegere, inclusiv “None”).
  - Save (Draft): permite `None` implicit; Publish cere selectarea explicită a scheduler‑ului.

---

## 6) Reservation Messages — Link public r/<token>, carduri, RO/EN, badge “nou”

- API public `/api/reservation-message/public/[token]` returnează:
  - `details` pentru cardul „Reservation details” (Property/Guest/Stay/Room)
  - `items[]`: toate templateurile publicate la proprietate; pentru fiecare → `title`, `html_ro`, `html_en`, `schedule_kind`, `visible` (în funcție de timp; pentru `none` → `visible=false`). UI afișează doar `visible=true`.
  - Tema paginii publice este forțată `light`.
- UI publică: `app/r/[token]/page.tsx` + `app/r/[token]/MessagesView.tsx` + `app/r/[token]/LanguageViewer.tsx`
  - Card “Reservation details” sus (iconuri `*_forlight.png`)
  - Lista carduri mesaje (titlu + cerc “nou” până la prima deschidere, persistat în LocalStorage per token & template)
  - La click pe card → toggle RO/EN (LanguageViewer) și conținutul mesajului.

---

## 7) Cron — trimitere *programată* a e‑mailurilor

- Endpoint: `app/api/reservation-message/cron/dispatch/route.ts`
  - Autorizare: `x-vercel-cron` (Vercel) sau `?key=CRON_SECRET` pentru rulări manuale.
  - Pentru fiecare rezervare cu `reservation_messages.status='active'`:
    - Încarcă șabloanele publicate ale proprietății.
    - Determină dacă mesajul este „due” conform `schedule_kind` + check‑in/out (fallback 14:00/11:00) și timezone proprietate (naiv în versiunea curentă — vezi Note).
    - Idempotency: verifică `email_outbox` pe `subject` ce include `[tpl:<template_id>]`.
    - Trimite e‑mail “You have a new message from <Property Name>” + buton “Open Reservation messages” către `/r/<token>`.
- Vercel Cron: `vercel.json`
  - `{"path": "/api/reservation-message/cron/dispatch", "schedule": "*/15 * * * *"}`

---

## 8) E‑mailuri

- E‑mail confirmare rezervare (după confirmare cameră):
  - “Reservation confirmation — <Property Name>”
  - Arată Guest, Stay (date), Room (dacă există) cu iconuri forlight și buton “Open Reservation messages”.
  - `app/api/reservation-message/confirm-room/route.ts`

- E‑mail mesaj nou programat (via cron):
  - “[Reservation messages] New message — <Template Title> [tpl:<id>]”
  - Text scurt + buton spre linkul public.
  - `app/api/reservation-message/cron/dispatch/route.ts`

- Confirmare check‑in (existent): `app/api/checkin/confirm/route.ts` (stilizat cu QR cu logo în centru)

---

## 9) Variabile de mediu

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- App URL: `NEXT_PUBLIC_APP_URL` (folosit în e‑mailuri / linkuri publice)
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `FROM_NAME`
- Cron: `CRON_SECRET` (opțional pentru rulări manuale)

---

## 10) Resurse publice necesare (public/)

- Check‑in / r/ci: `dashboard_forlight.png`, `logoguest_forlight.png`, `night_forlight.png`, `room_forlight.png` (și echivalente `*_fordark.png` dacă le folosești în alte locuri)
- OTA logos: `booking.png`, `airbnb.png`, `expedia.png`, `trivago.png`, `lastminute.png`, `travelminit.png`, `P4H_ota.png`
- Limbă: `ro.png`, `eng.png`
- QR logo: `p4h_logo_round.png`

---

## 11) Note & Limitări

- Timezone: calculele pentru „visible”/„due” folosesc Date naive. Pentru proprietăți în alte timezone‑uri, e recomandat un layer de TZ (ex. luxon) sau normalizare la UTC cu offset‑uri corecte.
- Idempotency e‑mailuri: cron se bazează pe subiectul care include `[tpl:<id>]` — robust la schimbări de titlu.
- “Badge nou” pe pagina publică e per device (LocalStorage); nu se persistă server‑side.
- Publish cere Scheduler; Save (draft) permite `None`.

---

## 12) Checklist testare

1) Confirmare cameră:
   - Confirmă camera pe o rezervare cu email de contact → primește “Reservation confirmation” + link r/<token>.
   - Deschide `/r/<token>`: vezi card “Reservation details”.
2) Editor:
   - Creează template, completează RO/EN, alege Scheduler, Publish.
   - Revino după refresh → ambele limbi persistă.
3) Mesaje programate & cron:
   - Setează check‑in/ check‑out astfel încât să se atingă momentul `hour_before_checkin`, `on_arrival` și `hours_before_checkout` (sau simulează cu date apropiate); cron va trimite e‑mail “New message…”.
   - În `/r/<token>`, cardurile devin vizibile conform timpului; badge “nou” dispare după click.
4) Check‑in public:
   - Verifică overlay contact + imagine, centrare, transparență, responsive; Export PDF cu iconuri “forlight”.

---

## 13) Fișiere cheie (orientativ)

- Check‑in Editor: `app/app/checkinEditor/ui/CheckinEditorClient.tsx`
- Public Check‑in: `app/checkin/ui/CheckinClient.tsx`, `app/r/ci/[id]/page.tsx`, `app/r/ci/ExportPdfButton.tsx`
- QR logo: `components/QrWithLogo.tsx`
- Reservation Messages — Editor: `app/app/reservationMessage/ui/ReservationMessageClient.tsx`
- Reservation Messages — Public: `app/r/[token]/page.tsx`, `app/r/[token]/LanguageViewer.tsx`, `app/r/[token]/MessagesView.tsx`
- API: vezi secțiunea 2
- Cron: `app/api/reservation-message/cron/dispatch/route.ts`, `vercel.json`

---

Dacă vrei localizare completă a e‑mailurilor în română sau ajustări de copy/branding, pot integra rapid (subiect/textele butoanelor/culori).
