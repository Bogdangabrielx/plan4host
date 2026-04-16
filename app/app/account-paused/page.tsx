import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPausedPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <AppShell currentPath="/app/account-paused" title="Account paused">
      <main
        style={{
          minHeight: "calc(100dvh - var(--app-header-h, 64px))",
          display: "grid",
          placeItems: "center",
          padding: 18,
          color: "var(--text)",
        }}
      >
        <section
          className="sb-cardglow"
          style={{
            width: "min(560px, 100%)",
            display: "grid",
            gap: 14,
            padding: 24,
            borderRadius: 22,
            border: "1px solid color-mix(in srgb, var(--primary) 30%, var(--border))",
            background: "var(--panel)",
            boxShadow: "0 22px 60px rgba(0,0,0,.22)",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              display: "grid",
              placeItems: "center",
              background: "color-mix(in srgb, var(--primary) 16%, transparent)",
              color: "var(--primary)",
              fontWeight: 900,
              fontSize: 22,
            }}
            aria-hidden="true"
          >
            !
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.08, letterSpacing: -0.4 }}>
              Account access is paused
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              Your organization&apos;s subscription has expired. Access to Plan4Host is currently paused until an account administrator reactivates the subscription.
            </p>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              Please contact your account administrator and ask them to choose a plan from the billing page.
            </p>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
