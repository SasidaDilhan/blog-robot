import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { updateDraft } from "../../../lib/supabase/helpers";

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const allowed = [
    "title",
    "content_html",
    "excerpt",
    "tags",
    "seo_title",
    "seo_description",
    "blog_id",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key];
  }

  const { error } = await updateDraft(supabase, {
    title: body.title,
    content_html: body.content_html,
    excerpt: body.excerpt,
    tags: body.tags,
    seo_title: body.seo_title,
    seo_description: body.seo_description,
    blog_id: body.blog_id,
  })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
