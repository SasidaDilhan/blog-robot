import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/superbase/server";
import { Draft } from "../../../lib/superbase/types";
import { updateDraft } from "../../../lib/superbase/helpers";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { draft_id } = await req.json().catch(() => ({}));
  if (!draft_id)
    return NextResponse.json({ error: "Missing draft_id" }, { status: 400 });

  const { data, error: fetchErr } = await supabase
    .from("drafts")
    .select("*")
    .eq("id", draft_id)
    .eq("user_id", user.id)
    .single();

  const draft = data as Draft | null;

  if (fetchErr || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  await updateDraft(supabase, { status: "publishing" })
    .eq("id", draft_id)
    .eq("user_id", user.id);

  const zapPayload = {
    draft_id: draft.id,
    title: draft.title,
    content_html: draft.content_html,
    excerpt: draft.excerpt,
    tags: (draft.tags ?? []).join(", "),
    seo_title: draft.seo_title,
    seo_description: draft.seo_description,
    blog_id: draft.blog_id,
    image_url: draft.image_url,
    secret: process.env.DRAFT_CALLBACK_SECRET,
  };

  try {
    const zapRes = await fetch(process.env.ZAPIER_ZAP2_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(zapPayload),
    });
    if (!zapRes.ok) throw new Error(`Zapier responded ${zapRes.status}`);
  } catch (err) {
    console.error("Zap2 trigger failed", err);
    await updateDraft(supabase, { status: "error" })
      .eq("id", draft_id)
      .eq("user_id", user.id);
    return NextResponse.json(
      { error: "Failed to trigger publish" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
