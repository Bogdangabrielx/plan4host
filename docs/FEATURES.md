# Plan4Host — Product Features

Below is a concise, marketing‑ready overview of the application’s capabilities, grouped by product areas. Copy sections as needed for website/features, sales collateral, or onboarding.

## Calendar & Availability
- Adaptive calendar for multi‑property portfolios
- Day and room views with quick booking detail modals
- Room assignment and conflict hints (awaiting room / mismatched)
- Google Calendar deep‑link and downloadable ICS attachments
- Timezone awareness per property

## Channel Sync (iCal)
- Import iCal feeds from Booking.com, Airbnb, Expedia and others
- Export iCal per room type or per room
- Provider branding: preset logos + custom logo upload
- Per‑integration color tagging and active toggle
- Autosync by plan interval (Basic/Standard/Premium)
- “Sync Now” trigger (Premium)

## Guest Overview
- Unified list of upcoming guests across properties
- Status badges: Confirmed booking / Awaiting room
- Fast search by guest name (mobile‑friendly)
- OTA source badge and color
- Open reservation actions (modify/confirm via calendar modal)
- QR code pop‑up for access links
- Past bookings toggle (show/hide history)

## Cleaning Board
- Smart cleaning priority (Next‑Check‑In focus)
- Tasks and room readiness flow
- Mobile‑first grid for quick operations

## Online Check‑in (Guest Forms)
- Secure, privacy‑aware check‑in form per property
- Document capture (ID) and digital signature
- Auto‑generated check‑in link (copy/share/QR)
- Custom property banner and contact overlay
- House Rules (PDF) upload and delivery
- Social links (Facebook, Instagram, TikTok, website)

## Check‑in Editor (Branding & Links)
- Per‑property presentation image and overlay position
- Source‑tagged share links (Booking, Airbnb, Expedia, Manual)
- Instant link copy with success feedback

## Automatic Messages (Reservation Message)
- Dual language templates (RO/EN) with per‑language blocks
- Live variables (built‑in + custom) and per‑room values
- Inline token chips and quick insert bar
- Schedules: before check‑in / on arrival / before check‑out
- Draft vs. Active publishing workflow
- Confirmation email with ICS attachment + calendar link
- Safe fallbacks for recipient email (form or booking contact)

## Property Setup
- Properties, room types, and rooms management
- Check‑in/out defaults and cleaning configuration
- Centralized settings with sidebar navigation

## Team & Roles
- Admin, Editor, Viewer roles (scope‑based gating)
- Access control enforced server‑side (ensureScope)

## Notifications
- Optional browser push permission prompt
- Device‑level subscription with VAPID keys
- iOS PWA hint for enabling notifications

## Subscription & Plans
- Basic / Standard / Premium plan tiers
- Autosync frequency per tier (60/30/10 minutes)
- Premium extras: “Sync Now”, team delegation
- In‑app subscription screen with plan highlights
- Billing‑only access mode redirect to Subscription when required

## Mobile & PWA Experience
- AppShell with single scroll container and safe‑area padding
- Bottom navigation on mobile; header on larger screens
- Smart keyboard handling (auto‑hide nav; scroll nudge)
- Installable PWA; offline page fallback

## UX & Theming
- Light/Dark themes with OKLCH/HSL tokens
- Accent palettes and gradient backgrounds per theme
- Focus rings and accessibility‑friendly defaults

## Legal & Privacy
- Dedicated Cookies, Terms pages
- Consent modal host and preference storage (Necessary/Preferences)

---

### Notes
- Features are enforced by server‑side scopes and plan entitlements where applicable.
- Integrations use iCal (ICS); pricing/availability logic of external OTAs remains on the provider.

---

## Beneficii (RO) — pe înțelesul tuturor

- Calendar adaptiv
  - Eviți overbooking-ul cu vizibilitate clară pe toate proprietățile (zi/room view, culori, alerte de conflict).
  - Drag & drop pentru alocări, inclusiv pe mobil, plus export/ICS și link direct Google Calendar.
- Check‑in online securizat (GDPR) + Self check‑in ușor
  - Formular prietenos, link scurt și QR pentru oaspeți; durează sub 60 de secunde.
  - Identitate (poză act) + semnătură digitală; linkuri care expiră automat; date stocate sigur în UE.
- Proprietăți și camere nelimitate
  - Scalezi fără costuri per unitate; organizezi pe locații/room‑types; configurare rapidă.
- Mesaje automate nelimitate către oaspeți
  - Secvențe RO/EN cu variabile dinamice (nume, dates, wifi etc.), înainte de check‑in, la sosire și înainte de check‑out.
  - ICS atașat și link calendar — mai puține întrebări repetitive, mai multe review‑uri bune.
- Autosync la 10 minute + Sync Now (Premium)
  - Disponibilitate aproape în timp real; un click pentru actualizare imediată; jurnal și status pe integrare.
- Smart cleaning board (Next‑Check‑In Priority)
  - Prioritizează camerele cu următorul check‑in, atribuie sarcini, marchează “ready”; totul gândit pentru mobil.
- Delegare sarcini în echipă
  - Roluri și permisiuni (admin/editor/viewer); acces doar la ce trebuie; notificări la nevoie.
- Guest Overview
  - O singură listă cu toți oaspeții; căutare rapidă; cod QR pentru rezervare; istoric ascuns/afișat la cerere.
- Brand & mesaje personalizate
  - Poze de prezentare, overlay poziționabil; editor de mesaje cu “token chips” și valori implicite pe cameră.
- Mobil & PWA
  - Instalabil pe telefon, bottom‑nav, gestionare smart a tastaturii, offline fallback; arată și funcționează ca o aplicație nativă.
- Conformitate & încredere
  - Consimțământ cookie, pagini legale, practici GDPR în check‑in — mai puțin stres, mai mult control.

Beneficiu direct: economisești ore pe săptămână, reduci erorile (overbooking / camere nepregătite), crești satisfacția oaspeților și ratingul listărilor — fără a plăti în plus pe proprietate sau cameră.

---

## Benefit Headlines (EN) — short, non‑technical

- Avoid overbookings across all properties
- Assign rooms with simple drag‑and‑drop
- Confirm bookings in one tap
- Share secure online check‑in links
- Scan IDs and capture signatures
- Self check‑in with QR access
- Auto‑sync calendars every few minutes
- Sync now when you need
- Keep calendars aligned across channels
- See all guests in one place
- Find any guest instantly
- Open reservation from anywhere, fast
- Prioritize cleanings by next check‑in
- Track room readiness in real time
- Delegate tasks to your team
- Send unlimited automated messages
- Personalize messages with smart variables
- Attach calendar invites automatically
- Keep brand consistent across properties
- Manage unlimited properties and rooms
- Works great on mobile and PWA
- Receive instant booking notifications
- Store data securely and GDPR‑ready
- Save hours every week consistently
