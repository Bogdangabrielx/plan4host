# Plan4Host DB Master Index

Acesta este punctul principal de intrare pentru documentația bazei de date Plan4Host.

Scop:
- să găsești rapid ce obiect există în `public`
- să înțelegi unde trăiește logica importantă
- să ai o hartă clară pentru audit, debugging și onboarding

## Cum Se Citește

Ordinea recomandată:

1. `01_public_schema_structure.md`
2. `02_public_schema_relationships.md`
3. `08_public_schema_access_model.md`
4. `09_public_schema_policy_catalog.md`
5. restul capitolelor, în funcție de nevoie

Dacă vrei doar orientare rapidă:
- structură
- access model
- known notes

Dacă investighezi un bug de date:
- relationships
- constraints
- triggers
- functions

Dacă investighezi performanță:
- indexes
- views

## Conținutul DB Bible

### Structură
- `01_public_schema_structure.md`
  Tabele, coloane, tipuri, default-uri, obiecte observate în `public`.

### Relații
- `02_public_schema_relationships.md`
  Foreign keys, dependențe, `CASCADE`, `SET NULL`, `RESTRICT`, `NO ACTION`.

### Integritate
- `03_public_schema_constraints.md`
  `PRIMARY KEY`, `UNIQUE`, `CHECK`, plus note despre consistență semantică.

### Performanță
- `04_public_schema_indexes.md`
  Indexuri, partial indexes, expression indexes, `GIN`, `GiST`, `INCLUDE`.

### Logică DB
- `05_public_schema_functions.md`
  Funcții de business, funcții de access/RLS, trigger functions, extensii tehnice.

- `06_public_schema_triggers.md`
  Triggere efective, tabele afectate, side-effects automate.

### Reporting
- `07_public_schema_views.md`
  Views din `public`, cu rolul lor de agregare și overview.

### Acces
- `08_public_schema_access_model.md`
  Grants, RLS, policy counts, excepții importante.

- `09_public_schema_policy_catalog.md`
  Policies RLS grupate pe tabele și pattern-uri de acces.

### Note De Audit
- `10_public_schema_known_notes.md`
  Outliers, observații, posibile redundanțe și puncte bune de reverificat.

## Snapshot Istoric

În afara folderului curent există și snapshot-ul de audit:

- `../2026-05_db_inventory_may_2026.sql`

Rolul lui:
- păstrează inventarierea de bază din mai 2026
- include query-urile brute de rerulare
- fixează concluziile legate de grants și schimbarea Supabase

## Întrebări Rapide

### Unde mă uit dacă vreau să înțeleg ce tabele există?
- `01_public_schema_structure.md`

### Unde mă uit dacă vreau să înțeleg ce se șterge în lanț?
- `02_public_schema_relationships.md`

### Unde mă uit dacă vreau să înțeleg de ce un insert/update e blocat?
- `03_public_schema_constraints.md`
- `09_public_schema_policy_catalog.md`

### Unde mă uit dacă vreau să înțeleg de ce un user vede sau nu vede date?
- `08_public_schema_access_model.md`
- `09_public_schema_policy_catalog.md`
- `05_public_schema_functions.md`

### Unde mă uit dacă vreau să înțeleg logică automată “invizibilă”?
- `06_public_schema_triggers.md`
- `05_public_schema_functions.md`

### Unde mă uit dacă vreau să înțeleg performanța?
- `04_public_schema_indexes.md`
- `07_public_schema_views.md`

### Unde mă uit dacă vreau să văd ce note merită ținute minte?
- `10_public_schema_known_notes.md`

## Ce Reprezintă Acest Set

Acest set de fișiere nu este:
- migration
- document oficial de produs
- garanție că fiecare regulă este perfectă

Este:
- o hartă tehnică serioasă
- un punct de pornire foarte bun pentru debugging
- o memorie practică a schemei `public`

## Status Curent

Versiunea actuală a “DB Bible” acoperă foarte bine schema `public`:
- model de date
- relații
- integritate
- performanță
- logică în DB
- acces
- note de audit

Pentru majoritatea întrebărilor despre baza de date, acest folder ar trebui să fie suficient ca prim punct de orientare.
