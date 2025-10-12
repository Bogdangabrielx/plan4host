# Guest Overview – Schimbări și logică actuală

Acest document descrie modificările recente ale ecranului Guest Overview și regulile curente de afișare/operare.

## Rezumat
- Afișăm doar formularele trimise de oaspeți (source='form' sau status 'hold'/'pending'), pentru orice interval (trecut/prezent/viitor).
- Am eliminat statusul „roșu”. Rămân două stări:
  - „Awaiting room” (galben): formular recepționat, nu s-a selectat încă o cameră (booking.room_id este null).
  - „Ready” (verde): a fost selectată o cameră (booking.room_id este setat).
- Alocarea se face direct pe `room_id` (nu pe tip de cameră). 
- „Edit form booking” permite modificarea datelor și selectarea camerei; se validează suprapunerea cu rezervări „confirmed” pentru camera aleasă.
- „Open reservation” deschide Room Detail pentru camera alocată, cu datele rezervării drept default.
- La „Automatic Message”, după ce selectezi un template, preview‑ul înlocuiește variabilele cu valori (fără „chip-uri” când lipsesc valori).

## Detalii de comportament
### Ce se afișează
- Doar rânduri care provin din formulare de check-in (fără evenimente OTA/iCal). 
- Lista include formulare din trecut, prezent și viitor (nu filtrăm pe dată).

### Statusuri
- Galben – „Awaiting room”: `room_id` este null.
- Verde – „Ready”: `room_id` este setat.

### Editare formular (dates + cameră)
- Din acțiunea „Edit form booking”:
  - Poți schimba intervalul de ședere (start_date/end_date).
  - Poți selecta o cameră (direct pe `room_id`).
  - La salvare, aplicăm un guard de suprapunere: dacă există o rezervare `confirmed` pe aceeași cameră și interval, salvarea este blocată cu mesaj explicit.
  - Dacă salvarea reușește, rezervarea este „mutată” pe noua cameră (camera veche rămâne liberă deoarece booking-ul nu mai aparține de ea).

### Open reservation
- Disponibil pentru rândurile „Ready” (au `room_id`).
- Deschide Room Detail pentru camera respectivă, inițializat cu datele rezervării (start/end) ale acelui booking.

### Automatic Messages (preview)
- După alegerea unui template, preview-ul înlocuiește `{{variabile}}` cu valorile disponibile.
- Pentru variabile fără valoare, se afișează șir gol (nu se mai afișează chip-uri).

## API
- Endpoint: `GET /api/guest-overview?property=<id>`
  - Returnează doar formulare (source='form' sau status 'hold'/'pending'), neanulate, pentru toate datele.
  - Status mapping în răspuns:
    - `yellow` dacă `room_id` este null
    - `green` dacă `room_id` este setat

## Note de implementare (pentru mentenanță)
- UI (Guest Overview): `app/app/guest/ui/GuestOverviewClient.tsx`
  - Legendă: doar „Awaiting room” și „Ready”.
  - Editare formular: alocare directă pe `room_id`; validare overlap pe rezervări `confirmed`.
  - Preview Automatic Message: variabilele sunt redate ca valori, fără chip-uri pentru lipsă.
- API listă: `app/api/guest-overview/route.ts`
  - Filtrare doar pe formulare, fără evenimente OTA/iCal.
  - Status stabilit din prezența/absența `room_id`.

## Posibile extinderi
- Setarea automată a `bookings.status = 'confirmed'` la alegerea camerei (după trecerea de validarea de suprapunere), dacă se dorește formalizarea stării în DB.
- Filtre/ordonări suplimentare (ex: doar viitoare, doar fără cameră, etc.).

