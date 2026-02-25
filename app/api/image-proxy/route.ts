import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const prompt = req.nextUrl.searchParams.get("prompt");
  const nonce = req.nextUrl.searchParams.get("nonce");
  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
  if (!hfKey) {
    return NextResponse.json(
      { error: "Missing HUGGINGFACE_API_KEY/HF_TOKEN on server" },
      { status: 500 },
    );
  }

  try {
    const photoPrompt = `Photorealistic professional product photography, natural lighting, realistic textures. ${prompt}`;
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: photoPrompt,
          parameters: {
            width: 1024,
            height: 576,
            num_inference_steps: 28,
            guidance_scale: 7.5,
            seed: nonce ? Number.parseInt(nonce, 10) || undefined : undefined,
            negative_prompt:
              "cartoon, illustration, anime, 3d render, cgi, plastic skin, distorted, blurry, low quality, watermark, text",
          },
          options: {
            use_cache: false,
            wait_for_model: true,
          },
        }),
        signal: AbortSignal.timeout(120000),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("HuggingFace error:", response.status, err);
      return NextResponse.json(
        {
          error: "Image generation failed",
          upstreamStatus: response.status,
          detail: err.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("Image proxy error:", err);
    return NextResponse.json(
      { error: "Timeout or fetch error" },
      { status: 504 },
    );
  }
}
