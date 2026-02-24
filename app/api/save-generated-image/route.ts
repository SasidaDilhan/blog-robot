import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "../../../lib/supabase/server";

const HF_MODEL_URL =
  "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0";

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image"
  );
}

async function saveToStorageAndDraft(params: {
  userId: string;
  draftId: string;
  prompt: string;
  bytes: Uint8Array;
  contentType: string;
}) {
  const { userId, draftId, prompt, bytes, contentType } = params;
  const bucket = process.env.SUPABASE_IMAGE_BUCKET || "draft-images";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const path = `${userId}/${draftId}/${Date.now()}-${slugify(prompt)}.${ext}`;

  const admin = createSupabaseAdminClient();
  const { error: uploadErr } = await admin.storage
    .from(bucket)
    .upload(path, bytes, {
      contentType,
      upsert: false,
    });

  if (uploadErr) {
    return {
      ok: false as const,
      status: 502,
      body: {
        error: "Storage upload failed",
        detail: uploadErr.message,
        bucket,
      },
    };
  }

  const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(path);
  const imageUrl = publicUrlData.publicUrl;

  const { error: updateErr } = await admin
    .from("drafts")
    .update({
      image_url: imageUrl,
      image_prompt: prompt,
    } as never)
    .eq("id", draftId)
    .eq("user_id", userId);

  if (updateErr) {
    return {
      ok: false as const,
      status: 500,
      body: { error: "DB update failed", detail: updateErr.message },
    };
  }

  return {
    ok: true as const,
    body: { ok: true, image_url: imageUrl, bucket, path },
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let draftId = "";
  let prompt = "";
  let uploadedImage: File | null = null;

  const reqContentType = req.headers.get("content-type") ?? "";
  if (reqContentType.includes("multipart/form-data")) {
    const form = await req.formData();
    draftId = String(form.get("draft_id") ?? "").trim();
    prompt = String(form.get("prompt") ?? "").trim();
    const file = form.get("image");
    if (file instanceof File) {
      uploadedImage = file;
    }
  } else {
    const body = await req.json().catch(() => ({}));
    draftId = String(body.draft_id ?? "").trim();
    prompt = String(body.prompt ?? "").trim();
  }

  if (!draftId || !prompt) {
    return NextResponse.json(
      { error: "Missing draft_id or prompt" },
      { status: 400 },
    );
  }

  const { data: draft, error: draftErr } = await supabase
    .from("drafts")
    .select("id,user_id")
    .eq("id", draftId)
    .eq("user_id", user.id)
    .single();

  if (draftErr || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  try {
    if (uploadedImage) {
      const bytes = new Uint8Array(await uploadedImage.arrayBuffer());
      const contentType = uploadedImage.type || "image/jpeg";
      const saved = await saveToStorageAndDraft({
        userId: user.id,
        draftId,
        prompt,
        bytes,
        contentType,
      });

      if (!saved.ok) {
        return NextResponse.json(saved.body, { status: saved.status });
      }

      return NextResponse.json(saved.body);
    }

    const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
    if (!hfKey) {
      return NextResponse.json(
        { error: "Missing HUGGINGFACE_API_KEY/HF_TOKEN" },
        { status: 500 },
      );
    }

    const photoPrompt = `Photorealistic professional product photography, natural lighting, realistic textures. ${prompt}`;
    const hfRes = await fetch(HF_MODEL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: photoPrompt,
        parameters: {
          width: 1200,
          height: 632,
          num_inference_steps: 28,
          guidance_scale: 7.5,
          negative_prompt:
            "cartoon, illustration, anime, 3d render, cgi, plastic skin, distorted, blurry, low quality, watermark, text",
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(120000),
    });

    if (!hfRes.ok) {
      const detail = await hfRes.text();
      console.error(
        "HuggingFace image generation failed",
        hfRes.status,
        detail,
      );
      return NextResponse.json(
        { error: "Image generation failed", upstreamStatus: hfRes.status },
        { status: 502 },
      );
    }

    const bytes = new Uint8Array(await hfRes.arrayBuffer());
    const contentType = hfRes.headers.get("content-type") || "image/jpeg";
    const saved = await saveToStorageAndDraft({
      userId: user.id,
      draftId,
      prompt,
      bytes,
      contentType,
    });
    if (!saved.ok)
      return NextResponse.json(saved.body, { status: saved.status });
    return NextResponse.json(saved.body);
  } catch (error) {
    console.error("Save generated image failed", error);
    return NextResponse.json(
      { error: "Timeout or fetch error" },
      { status: 504 },
    );
  }
}
