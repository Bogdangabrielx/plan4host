import AppShell from "../_components/AppShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";

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
          alignItems: "start",
          justifyItems: "center",
          padding: "clamp(28px, 8vh, 72px) 18px 18px",
          color: "var(--text)",
        }}
      >
        <section
          style={{
            width: "min(560px, 100%)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Image
            src="/renewal.png"
            alt="Account access is paused until the subscription is renewed"
            width={960}
            height={720}
            priority
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              borderRadius: 24,
              overflow: "hidden",
            }}
          />
        </section>
      </main>
    </AppShell>
  );
}
