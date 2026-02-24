import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "../../../lib/supabase/server";

function extractStoragePath(imageUrl: string, bucket: string) {
  try {
    const url = new URL(imageUrl);
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
    ];

    const marker = markers.find((m) => url.pathname.includes(m));
    if (!marker) return null;

    const [, tail = ""] = url.pathname.split(marker);
    return decodeURIComponent(tail);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const draftId = String(body.draft_id ?? "").trim();

  if (!draftId) {
    return NextResponse.json({ error: "Missing draft_id" }, { status: 400 });
  }

  const { data: draft, error: fetchErr } = await supabase
    .from("drafts")
    .select("id,user_id,image_url")
    .eq("id", draftId)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const bucket = process.env.SUPABASE_IMAGE_BUCKET || "draft-images";
  const imagePath = draft.image_url
    ? extractStoragePath(draft.image_url, bucket)
    : null;

  if (imagePath) {
    const admin = createSupabaseAdminClient();
    const { error: storageErr } = await admin.storage
      .from(bucket)
      .remove([imagePath]);

    if (storageErr) {
      console.error("Failed to delete draft image from storage", storageErr);
      return NextResponse.json(
        {
          error: "Failed to delete draft image from storage",
          detail: storageErr.message,
        },
        { status: 502 },
      );
    }
  }

  const { error } = await supabase
    .from("drafts")
    .delete()
    .eq("id", draftId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
