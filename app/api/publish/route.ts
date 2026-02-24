import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "../../../lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { draft_id } = await req.json();

  // Fetch the full draft
  const { data: draft } = await (supabase as any)
    .from("drafts")
    .select("*")
    .eq("id", draft_id)
    .eq("user_id", user.id)
    .single();

  if (!draft)
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  // Update status to publishing
  const admin = createSupabaseAdminClient();
  await (admin as any)
    .from("drafts")
    .update({ status: "publishing" } as never)
    .eq("id", draft_id);

  // Callback URL — Zapier will POST back here when done
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/draft-callback`;

  console.log("Publishing draft:", draft_id);
  console.log("Callback URL:", callbackUrl);
  console.log("Zap2 URL:", process.env.ZAPIER_ZAP2_WEBHOOK_URL);

  // Trigger Zap #2
  const zapRes = await fetch(process.env.ZAPIER_ZAP2_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      draft_id: draft.id,
      user_id: draft.user_id,
      title: draft.title,
      content_html: draft.content_html ?? "",
      excerpt: draft.excerpt ?? "",
      tags: Array.isArray(draft.tags)
        ? draft.tags.join(", ")
        : (draft.tags ?? ""),
      seo_title: draft.seo_title ?? "",
      seo_description: draft.seo_description ?? "",
      image_url: draft.image_url ?? "",
      blog_id: draft.blog_id ?? "",
      callback_url: callbackUrl, // ← this is what Zapier uses to call back
      secret: process.env.DRAFT_CALLBACK_SECRET,
    }),
  });

  if (!zapRes.ok) {
    const errText = await zapRes.text();
    console.error("Zap2 trigger failed:", zapRes.status, errText);
    await (admin as any)
      .from("drafts")
      .update({ status: "error" } as never)
      .eq("id", draft_id);
    return NextResponse.json(
      { error: "Failed to trigger publish zap" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
