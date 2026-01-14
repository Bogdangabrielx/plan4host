import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const STEPS = [
  "property",
  "picture",
  "room",
  "calendars",
  "links_contact",
  "house_rules",
  "message_template",
] as const;

export type OnboardingStepId = (typeof STEPS)[number];

type OnboardingStateResponse = {
  completed: OnboardingStepId[];
  dismissed: OnboardingStepId[];
  completedAt: string | null;
};

const TOUCH_THROTTLE_SECONDS = 60;

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Ensure row exists (DB trigger also does this on account creation; this is defensive).
  try {
    await supabase
      .from("account_onboarding_state")
      .upsert({ account_id: user.id }, { onConflict: "account_id" });
  } catch {}

  // If onboarding already marked as fully completed, just return that state.
  const { data: stateRow } = await supabase
    .from("account_onboarding_state")
    .select("dismissed_steps, completed_at, steps, last_seen_at")
    .eq("account_id", user.id)
    .maybeSingle();

  const dismissed = (stateRow?.dismissed_steps || []) as string[];
  const completedAt = stateRow?.completed_at
    ? new Date(stateRow.completed_at as string).toISOString()
    : null;

  const nowIso = new Date().toISOString();
  const lastSeenIso = stateRow?.last_seen_at
    ? new Date(stateRow.last_seen_at as string).toISOString()
    : null;
  const shouldTouch =
    !lastSeenIso ||
    Date.parse(lastSeenIso) < Date.now() - TOUCH_THROTTLE_SECONDS * 1000;
  if (shouldTouch) {
    try {
      await supabase
        .from("account_onboarding_state")
        .update({ last_seen_at: nowIso })
        .eq("account_id", user.id);
    } catch {}
  }

  if (completedAt) {
    const dismissedFiltered = dismissed.filter((s): s is OnboardingStepId =>
      (STEPS as readonly string[]).includes(s),
    );
    const resp: OnboardingStateResponse = {
      completed: [...STEPS],
      dismissed: dismissedFiltered,
      completedAt,
    };
    return NextResponse.json(resp);
  }

  // Determine progress for the first property only.
  const { data: props } = await supabase
    .from("properties")
    .select(
      "id, name, contact_email, contact_phone, contact_address, presentation_image_url, presentation_image_uploaded_at, regulation_pdf_url, ai_house_rules_text",
    )
    .order("created_at", { ascending: true });

  const firstProp = Array.isArray(props) && props.length > 0 ? (props[0] as any) : null;

  // property: at least one property exists
  const hasProperty = !!firstProp;

  // room: at least one room for first property
  let hasRoom = false;
  // message_template: at least one reservation template for first property
  let hasTemplate = false;
  // calendars: at least one iCal integration for first property
  let hasCalendars = false;

  if (firstProp) {
    const propId = firstProp.id as string;

    try {
      const { count: roomsCount } = (await supabase
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .eq("property_id", propId)) as any;
      hasRoom = (roomsCount ?? 0) > 0;
    } catch {
      hasRoom = false;
    }

    try {
      const { count: tmplCount } = (await supabase
        .from("reservation_templates")
        .select("id", { count: "exact", head: true })
        .eq("property_id", propId)) as any;
      hasTemplate = (tmplCount ?? 0) > 0;
    } catch {
      hasTemplate = false;
    }

    try {
      const { count: icalCount } = (await supabase
        .from("ical_type_integrations")
        .select("id", { count: "exact", head: true })
        .eq("property_id", propId)) as any;
      hasCalendars = (icalCount ?? 0) > 0;
    } catch {
      hasCalendars = false;
    }
  }

  // links_contact: at least one contact or social link
  const hasLinksContact =
    !!firstProp &&
    !!(
      firstProp.contact_email ||
      firstProp.contact_phone ||
      firstProp.contact_address
    );

  // picture: custom picture uploaded (different from default seed)
  const hasPicture =
    !!firstProp &&
    !!firstProp.presentation_image_uploaded_at &&
    !!firstProp.presentation_image_url &&
    firstProp.presentation_image_url !== "/hotel_room_1456x816.jpg";

  // house_rules: either PDF or AI text present
  const hasHouseRules =
    !!firstProp &&
    !!(firstProp.regulation_pdf_url || firstProp.ai_house_rules_text);

  const completed: OnboardingStepId[] = [];
  if (hasProperty) completed.push("property");
  if (hasRoom) completed.push("room");
  if (hasLinksContact) completed.push("links_contact");
  if (hasPicture) completed.push("picture");
  if (hasTemplate) completed.push("message_template");
  if (hasHouseRules) completed.push("house_rules");
  if (hasCalendars) completed.push("calendars");

  // Persist per-step completion timestamps + insert a single event when a step is first detected as completed.
  // This lets you query onboarding progress per account without relying on UI-only state.
  const existingSteps =
    (stateRow as any)?.steps && typeof (stateRow as any).steps === "object"
      ? ((stateRow as any).steps as Record<string, any>)
      : {};
  const newlyCompleted: OnboardingStepId[] = [];
  const nextSteps: Record<string, any> = { ...existingSteps };
  for (const stepId of completed) {
    const cur = nextSteps[stepId];
    const done = !!(cur && typeof cur === "object" && cur.done === true);
    if (!done) {
      nextSteps[stepId] = { done: true, at: nowIso };
      newlyCompleted.push(stepId);
    }
  }
  if (newlyCompleted.length > 0) {
    try {
      await supabase
        .from("account_onboarding_state")
        .update({ steps: nextSteps })
        .eq("account_id", user.id);
    } catch {}
    try {
      const email = String(user.email || "").trim() || null;
      await supabase.from("account_onboarding_events").insert(
        newlyCompleted.map((step) => ({
          account_id: user.id,
          account_email: email,
          event: "step_completed",
          step_id: step,
          meta: {},
        })),
      );
    } catch {}
  }

  const dismissedFiltered = dismissed.filter((s): s is OnboardingStepId =>
    (STEPS as readonly string[]).includes(s),
  );

  const resp: OnboardingStateResponse = {
    completed,
    dismissed: dismissedFiltered,
    completedAt: null,
  };

  return NextResponse.json(resp);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: "dismiss_step" | "complete_all" | "track";
    step_id?: OnboardingStepId;
    event?: string;
    meta?: unknown;
  };

  const action = body.action;
  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  if (action === "dismiss_step") {
    const step = body.step_id;
    if (!step || !(STEPS as readonly string[]).includes(step)) {
      return NextResponse.json({ error: "Invalid step_id" }, { status: 400 });
    }
    const { data: current } = await supabase
      .from("account_onboarding_state")
      .select("dismissed_steps")
      .eq("account_id", user.id)
      .maybeSingle();
    const existing = ((current?.dismissed_steps as string[]) || []).filter((s) =>
      (STEPS as readonly string[]).includes(s),
    );
    if (!existing.includes(step)) existing.push(step);
    await supabase
      .from("account_onboarding_state")
      .upsert(
        { account_id: user.id, dismissed_steps: existing },
        { onConflict: "account_id" },
      );
    try {
      const email = String(user.email || "").trim() || null;
      await supabase.from("account_onboarding_events").insert({
        account_id: user.id,
        account_email: email,
        event: "dismiss_step",
        step_id: step,
        meta: {},
      });
    } catch {}
    return NextResponse.json({ ok: true });
  }

  if (action === "complete_all") {
    const now = new Date().toISOString();
    await supabase
      .from("account_onboarding_state")
      .upsert(
        { account_id: user.id, completed_at: now },
        { onConflict: "account_id" },
      );
    try {
      const email = String(user.email || "").trim() || null;
      await supabase.from("account_onboarding_events").insert({
        account_id: user.id,
        account_email: email,
        event: "complete_all",
        step_id: null,
        meta: {},
      } as any);
    } catch {}
    return NextResponse.json({ ok: true, completed_at: now });
  }

  if (action === "track") {
    const event = String(body.event || "").trim();
    if (!event || event.length > 80) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }
    const step = body.step_id;
    if (step && !(STEPS as readonly string[]).includes(step)) {
      return NextResponse.json({ error: "Invalid step_id" }, { status: 400 });
    }
    const meta =
      body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
        ? (body.meta as Record<string, unknown>)
        : {};

    try {
      await supabase
        .from("account_onboarding_state")
        .upsert({ account_id: user.id }, { onConflict: "account_id" });
    } catch {}
    try {
      await supabase
        .from("account_onboarding_state")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("account_id", user.id);
    } catch {}
    try {
      const email = String(user.email || "").trim() || null;
      await supabase.from("account_onboarding_events").insert({
        account_id: user.id,
        account_email: email,
        event,
        step_id: step ?? null,
        meta,
      } as any);
    } catch {}

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
