import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { insertDraft } from "../../../lib/supabase/helpers";
import { Draft } from "../../../lib/supabase/types";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title: string = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // 1. Create draft row
  const { data, error: insertError } = await insertDraft(supabase, {
    user_id: user.id,
    title,
    status: "generating",
  })
    .select()
    .single();

  const draft = data as Draft | null;

  if (insertError || !draft) {
    console.error("Draft insert failed", insertError);
    return NextResponse.json(
      { error: "Failed to create draft" },
      { status: 500 },
    );
  }

  // 2. Trigger Zapier Zap #1
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/draft-callback`;
  const zapPayload = {
    draft_id: draft.id,
    user_id: user.id,
    title,
    callback_url: callbackUrl,
    secret: process.env.DRAFT_CALLBACK_SECRET,
  };

  try {
    const zapRes = await fetch(process.env.ZAPIER_ZAP1_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(zapPayload),
    });
    if (!zapRes.ok) throw new Error(`Zapier responded ${zapRes.status}`);
  } catch (err) {
    console.error("Zapier Zap1 trigger failed", err);
    // Don't block the user — draft row exists, they'll see "generating"
  }

  return NextResponse.json({ draft_id: draft.id });
}
// ← delete the local insertDraft stub that was here
