import CronCheckClient from "./ui/CronCheckClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CronCheckPage() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 16, fontFamily: 'Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', color: 'var(--text)' }}>
      <h1 style={{ marginTop: 0 }}>Cron Status</h1>
      <p style={{ color: 'var(--muted)' }}>
        Quick checks for cron endpoints. Auth check is non-destructive; Run now will execute the job.
      </p>
      <CronCheckClient />
    </main>
  );
}

