"use client";

import { useState, useEffect, useCallback } from "react";
import { Draft } from "../../../lib/supabase/types";

interface BlogPreviewProps {
  draft: Draft;
  onUpdate: (fields: Partial<Draft>) => void;
}

interface InlineImage {
  prompt: string;
  src: string | null;
  loading: boolean;
  error: boolean;
}

function useInlineImages(html: string, mainPrompt: string | null) {
  const [images, setImages] = useState<Record<string, InlineImage>>({});

  const generateImage = useCallback(async (prompt: string) => {
    setImages((prev) => ({
      ...prev,
      [prompt]: { prompt, src: null, loading: true, error: false },
    }));
    try {
      const res = await fetch(
        `/api/image-proxy?prompt=${encodeURIComponent(prompt)}`,
      );
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const src = URL.createObjectURL(blob);
      setImages((prev) => ({
        ...prev,
        [prompt]: { prompt, src, loading: false, error: false },
      }));
    } catch {
      setImages((prev) => ({
        ...prev,
        [prompt]: { prompt, src: null, loading: false, error: true },
      }));
    }
  }, []);

  useEffect(() => {
    const markers = Array.from(
      (html ?? "").matchAll(/\[\[IMAGE:\s*([^\]]+)\]\]/g),
    ).map((m) => m[1].trim());

    const allPrompts = mainPrompt
      ? [mainPrompt, ...markers.filter((m) => m !== mainPrompt)]
      : markers;

    allPrompts.forEach((prompt) => {
      if (!images[prompt]) generateImage(prompt);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, mainPrompt]);

  return { images, generateImage };
}

function ImageBlock({
  prompt,
  images,
  onRetry,
}: {
  prompt: string;
  images: Record<string, InlineImage>;
  onRetry: (p: string) => void;
}) {
  const img = images[prompt];
  if (!img || img.loading) {
    return (
      <div className="w-full min-h-48 bg-gray-100 rounded-xl flex flex-col items-center justify-center gap-2 my-6">
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-400">Generating image…</span>
      </div>
    );
  }
  if (img.error) {
    return (
      <div className="w-full min-h-48 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center justify-center gap-2 my-6">
        <span className="text-sm text-red-400">⚠ Image failed to load</span>
        <button
          onClick={() => onRetry(prompt)}
          className="text-xs text-indigo-500 underline"
        >
          Retry ↺
        </button>
      </div>
    );
  }
  if (img.src) {
    return (
      <figure className="my-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.src}
          alt={prompt}
          className="w-full rounded-xl object-cover"
        />
      </figure>
    );
  }
  return null;
}

function renderBodyParts(
  html: string,
  images: Record<string, InlineImage>,
  onRetry: (p: string) => void,
): React.ReactNode[] {
  const parts = html.split(/(\[\[IMAGE:[^\]]+\]\])/g);
  return parts.map((part, i) => {
    const match = part.match(/\[\[IMAGE:\s*([^\]]+)\]\]/);
    if (match) {
      return (
        <ImageBlock
          key={i}
          prompt={match[1].trim()}
          images={images}
          onRetry={onRetry}
        />
      );
    }
    return (
      <div
        key={i}
        className="prose prose-lg max-w-none text-gray-800
          prose-h1:text-3xl prose-h1:font-bold prose-h1:mt-8 prose-h1:mb-3
          prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-7 prose-h2:mb-2
          prose-h3:text-xl  prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-2
          prose-p:leading-relaxed prose-p:mb-4
          prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4
          prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4
          prose-li:mb-1
          prose-a:text-indigo-600 prose-a:underline
          prose-strong:font-bold"
        dangerouslySetInnerHTML={{ __html: part }}
      />
    );
  });
}

export default function BlogPreview({ draft, onUpdate }: BlogPreviewProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(draft.title);

  const { images, generateImage } = useInlineImages(
    draft.content_html ?? "",
    draft.image_prompt,
  );

  const featuredImage = draft.image_prompt ? images[draft.image_prompt] : null;

  const bodyParts = renderBodyParts(
    draft.content_html ?? "",
    images,
    generateImage,
  );

  return (
    <div className="bg-white min-h-screen font-serif">
      {/* ── Store header ── */}
      <div className="bg-gray-900 text-white px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14">
          <span className="font-bold text-lg tracking-wide">✦ YourStore</span>
          <nav className="flex gap-6 text-sm font-sans">
            {["Home", "Shop", "Blog", "About"].map((item) => (
              <span
                key={item}
                className={`cursor-pointer transition-opacity ${
                  item === "Blog"
                    ? "opacity-100"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                {item}
              </span>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Breadcrumb ── */}
      <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-2 text-xs text-gray-400 font-sans">
        <span className="hover:text-gray-600 cursor-pointer">Home</span>
        <span>›</span>
        <span className="hover:text-gray-600 cursor-pointer">Blog</span>
        <span>›</span>
        <span className="text-gray-600 truncate max-w-xs">{draft.title}</span>
      </div>

      {/* ── Article ── */}
      <article className="max-w-4xl mx-auto px-6 pb-20">
        {/* Hero image with title overlay */}
        <div
          className="relative w-full rounded-2xl overflow-hidden bg-gray-100 mb-8"
          style={{ aspectRatio: "16/7" }}
        >
          {/* Image states */}
          {featuredImage?.loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-100">
              <div className="w-8 h-8 border-3 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400 font-sans">
                Generating featured image…
              </p>
              <p className="text-xs text-gray-300 font-sans">20-30 seconds</p>
            </div>
          )}
          {featuredImage?.src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featuredImage.src}
              alt={draft.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {featuredImage?.error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-50">
              <span className="text-red-400 text-sm font-sans">
                ⚠ Featured image failed
              </span>
              <button
                onClick={() =>
                  draft.image_prompt && generateImage(draft.image_prompt)
                }
                className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg font-sans"
              >
                Retry
              </button>
            </div>
          )}
          {!draft.image_prompt && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <span className="text-gray-400 text-sm font-sans">
                No featured image
              </span>
            </div>
          )}

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 via-black/40 to-transparent px-8 py-6">
            {editingTitle ? (
              <input
                autoFocus
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={() => {
                  setEditingTitle(false);
                  onUpdate({ title: localTitle });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingTitle(false);
                    onUpdate({ title: localTitle });
                  }
                }}
                className="w-full bg-white/10 border border-white/30 rounded-lg text-white text-2xl font-bold px-3 py-2 outline-none placeholder:text-white/50 font-serif"
              />
            ) : (
              <h1
                className="text-white text-2xl md:text-3xl font-bold leading-tight cursor-pointer group flex items-start gap-2"
                onClick={() => setEditingTitle(true)}
              >
                {draft.title}
                <span className="text-sm opacity-0 group-hover:opacity-60 transition-opacity mt-1 font-sans">
                  ✎
                </span>
              </h1>
            )}
            <div className="flex items-center gap-2 mt-2 text-white/70 text-xs font-sans">
              <span>
                {new Date(draft.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              {draft.tags && draft.tags.length > 0 && (
                <>
                  <span className="opacity-40">·</span>
                  <span>{draft.tags.slice(0, 3).join(", ")}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Excerpt */}
        {draft.excerpt !== null && (
          <p
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) =>
              onUpdate({ excerpt: e.currentTarget.textContent ?? "" })
            }
            className="text-lg text-gray-500 italic leading-relaxed border-l-4 border-gray-200 pl-5 mb-8 outline-none focus:border-gray-400 focus:bg-gray-50 rounded-r-lg py-1 cursor-text"
          >
            {draft.excerpt}
          </p>
        )}

        {/* Body content */}
        <div className="mb-8">{bodyParts}</div>

        {/* Inline image tip */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 mb-8">
          <p className="text-xs text-blue-600 font-sans">
            <strong>💡 Tip:</strong> Add{" "}
            <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-700">
              {"[[IMAGE: your description]]"}
            </code>{" "}
            anywhere in your content to auto-generate and embed images.
          </p>
        </div>

        {/* Tags */}
        {draft.tags && draft.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-6 border-t border-gray-100">
            {draft.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-sans hover:bg-gray-200 transition cursor-pointer"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
