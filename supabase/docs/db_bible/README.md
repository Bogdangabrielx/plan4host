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
- `01_public_schema_structure.md`
  Prima hartă a schemei `public`, pornită din inventarierea din mai 2026.

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
