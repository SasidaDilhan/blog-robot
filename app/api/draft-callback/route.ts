import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../lib/superbase/server";
import { updateDraft } from "../../../lib/superbase/helpers";

interface CallbackBody {
  secret: string;
  draft_id: string;
  user_id: string;
  content_html?: string;
  excerpt?: string;
  tags?: string | string[]; // ← accept both
  seo_title?: string;
  seo_description?: string;
  image_prompt?: string;
  image_url?: string;
}

export async function POST(req: NextRequest) {
  let body: CallbackBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 1. Validate shared secret
  if (body.secret !== process.env.DRAFT_CALLBACK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Validate required fields
  if (!body.draft_id || !body.user_id) {
    return NextResponse.json(
      { error: "Missing draft_id or user_id" },
      { status: 400 },
    );
  }

  // 3. Update draft using admin client (bypasses RLS safely server-side)
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("drafts")
    .update({
      status: "draft",
      content_html: body.content_html ?? null,
      excerpt: body.excerpt ?? null,
      tags: body.tags
        ? Array.isArray(body.tags)
          ? body.tags
          : body.tags
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean)
        : null,
      seo_title: body.seo_title ?? null,
      seo_description: body.seo_description ?? null,
      image_prompt: body.image_prompt ?? null,
      image_url: body.image_url ?? null, // ← add
    } as unknown as never)
    .eq("id", body.draft_id)
    .eq("user_id", body.user_id); // defense-in-depth even with admin client

  if (error) {
    console.error("Draft update failed", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
