# Plan4Host DB Bible

Acest folder este o zonă de referință pentru baza de date Plan4Host.

Scop:
- să avem o imagine clară asupra structurii din `public`
- să putem revedea rapid tabelele, coloanele și regulile importante
- să păstrăm istoric de audit și convenții pentru viitoarele migrations

Reguli simple:
- fișierele de aici sunt documentație, nu afectează aplicația
- după schimbări importante de DB, documentația se actualizează
- snapshot-urile datate rămân separate de documentele canonice

Fișiere curente:
- `DB_MASTER_INDEX.md`
  Pagina principală de orientare rapidă pentru întreaga documentație DB.
- `01_public_schema_structure.md`
  Prima hartă a schemei `public`, pornită din inventarierea din mai 2026.
- `02_public_schema_relationships.md`
  Harta relațiilor dintre tabelele din `public`, cu accent pe foreign keys și regulile de ștergere.
- `03_public_schema_constraints.md`
  Regulile de integritate observate în schema `public`: primary keys, unique constraints și check constraints.
- `04_public_schema_indexes.md`
  Harta indexurilor din `public`, cu accent pe lookup, listare, timeline, partial indexes și cazuri speciale de performanță.
- `05_public_schema_functions.md`
  Catalogul funcțiilor din `public`, separat între logică de aplicație și funcții tehnice de extensie.
- `06_public_schema_triggers.md`
  Harta triggerelor efective din `public`, cu tabelele afectate și funcțiile apelate automat.
- `07_public_schema_views.md`
  Catalogul view-urilor din `public`, cu accent pe scopul lor de reporting și agregare.
- `08_public_schema_access_model.md`
  Rezumatul grants + RLS + policy counts pentru tabelele din `public`, inclusiv excepțiile importante.
- `09_public_schema_policy_catalog.md`
  Catalogul politicilor RLS din `public`, grupat pe tabele și pe pattern-uri de acces.
- `10_public_schema_known_notes.md`
  Observații, outliers și note de audit care merită ținute minte când revenim la schema DB.

Referințe utile deja existente:
- `../2026-05_db_inventory_may_2026.sql`
  Snapshot de audit pentru grants, RLS, policies și compatibilitatea cu schimbarea Supabase privind `GRANT`.

Pași următori recomandați pentru completarea "Bibliei":
- relații și foreign keys
- indexuri
- funcții și triggere
- matrice de acces pe roluri
- fluxuri de business pe tabele
- convenții pentru tabele noi
