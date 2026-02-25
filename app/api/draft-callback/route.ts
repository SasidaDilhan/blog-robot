import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/server";

interface CallbackBody {
  secret: string;
  draft_id: string;
  user_id: string;
  status?: string;
  content_html?: string;
  excerpt?: string;
  tags?: string | string[];
  seo_title?: string;
  seo_description?: string;
  image_prompt?: string;
  image_url?: string;
  shopify_url?: string;
  shopify_article_id?: string;
}

export async function POST(req: NextRequest) {
  let body: CallbackBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Log everything
  console.log("Full callback body:", JSON.stringify(body));

  if (body.secret !== process.env.DRAFT_CALLBACK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  // ── Zap #2 callback — published ──
  if (body.status === "published") {
    const updates: Record<string, unknown> = { status: "published" };
    if (body.shopify_url) updates.shopify_url = body.shopify_url;
    if (body.shopify_article_id)
      updates.shopify_article_id = body.shopify_article_id;

    const { error } = await (admin as any)
      .from("drafts")
      .update(updates as never)
      .eq("id", body.draft_id)
      .eq("user_id", body.user_id);

    if (error) {
      console.error("Failed to mark published:", error);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    console.log("✅ Draft marked published:", body.draft_id, body.shopify_url);
    return NextResponse.json({ ok: true });
  }

  // ── Zap #1 callback — content generated ──
  const updates: Record<string, unknown> = { status: "draft" };

  if (body.content_html) updates.content_html = body.content_html;
  if (body.excerpt) updates.excerpt = body.excerpt;
  if (body.seo_title) updates.seo_title = body.seo_title;
  if (body.seo_description) updates.seo_description = body.seo_description;
  if (body.image_prompt) updates.image_prompt = body.image_prompt;
  if (body.image_url) updates.image_url = body.image_url;

  if (body.tags) {
    updates.tags = Array.isArray(body.tags)
      ? body.tags
      : body.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean);
  }

  const { error } = await (admin as any)
    .from("drafts")
    .update(updates as never)
    .eq("id", body.draft_id)
    .eq("user_id", body.user_id);

  if (error) {
    console.error("Callback update failed:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  console.log("✅ Draft content saved:", body.draft_id);
  return NextResponse.json({ ok: true });
}
