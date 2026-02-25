"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Draft } from "../../../lib/supabase/types";

// Load Tiptap only client-side
const RichEditorClient = dynamic(() => import("./RichEditorClient"), {
  ssr: false,
  loading: () => <div className="h-10 bg-gray-100 animate-pulse rounded-lg" />,
});

// ─── Image generation hook ────────────────────────────────────────────────────

interface ImgState {
  src: string | null;
  loading: boolean;
  error: boolean;
}

function useImages(prompts: string[]) {
  const [images, setImages] = useState<Record<string, ImgState>>({});
  const generating = useRef<Set<string>>(new Set());

  const generate = useCallback(async (prompt: string) => {
    if (generating.current.has(prompt)) return;
    generating.current.add(prompt);
    setImages((p) => ({
      ...p,
      [prompt]: { src: null, loading: true, error: false },
    }));
    try {
      const nonce = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
      const res = await fetch(
        `/api/image-proxy?prompt=${encodeURIComponent(prompt)}&nonce=${nonce}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setImages((p) => ({
        ...p,
        [prompt]: { src: blobUrl, loading: false, error: false },
      }));
    } catch {
      setImages((p) => ({
        ...p,
        [prompt]: { src: null, loading: false, error: true },
      }));
    } finally {
      generating.current.delete(prompt);
    }
  }, []);

  useEffect(() => {
    prompts.forEach((p) => {
      if (!images[p]) generate(p);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(prompts)]);

  return { images, generate };
}

// ─── Parse [[IMAGE:]] markers ─────────────────────────────────────────────────

function parseSegments(
  html: string,
): { type: "html" | "image"; content: string }[] {
  return html
    .split(/(\[\[IMAGE:[^\]]+\]\])/g)
    .map((part) => {
      const m = part.match(/\[\[IMAGE:\s*([^\]]+)\]\]/);
      if (m) return { type: "image" as const, content: m[1].trim() };
      return { type: "html" as const, content: part };
    })
    .filter((s) => s.content.trim());
}

// ─── Inline image block ───────────────────────────────────────────────────────

function InlineImageBlock({
  prompt,
  images,
  onRetry,
}: {
  prompt: string;
  images: Record<string, ImgState>;
  onRetry: (p: string) => void;
}) {
  const img = images[prompt];
  if (!img || img.loading)
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-3 my-8">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Generating image…</p>
        <p className="text-xs text-gray-300">20–30 seconds</p>
      </div>
    );
  if (img.error)
    return (
      <div className="w-full aspect-video bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center justify-center gap-3 my-8">
        <p className="text-sm text-red-400">⚠ Image failed</p>
        <button
          onClick={() => onRetry(prompt)}
          className="text-xs bg-gray-900 text-white px-4 py-1.5 rounded-full"
        >
          Retry ↺
        </button>
      </div>
    );
  if (img.src)
    return (
      <figure className="my-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.src}
          alt={prompt}
          className="w-full rounded-2xl object-cover shadow-sm"
        />
        <figcaption className="text-center text-xs text-gray-400 mt-2 italic">
          {prompt}
        </figcaption>
      </figure>
    );
  return null;
}

// ─── Blog preview ─────────────────────────────────────────────────────────────

function BlogPreview({
  draft,
  images,
  generate,
  saveFeaturedImage,
  savingImage,
  segments,
}: {
  draft: Draft;
  images: Record<string, ImgState>;
  generate: (p: string) => void;
  saveFeaturedImage: () => void;
  savingImage: boolean;
  segments: { type: "html" | "image"; content: string }[];
}) {
  const featuredImg = draft.image_prompt ? images[draft.image_prompt] : null;
  const featuredSrc = featuredImg?.src ?? draft.image_url ?? null;
  const showFeaturedLoading = !draft.image_url && Boolean(featuredImg?.loading);
  const showFeaturedError =
    !draft.image_url && Boolean(featuredImg?.error) && !featuredImg?.src;

  return (
    <div className="bg-white font-serif">
      {/* Store header */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
          <span className="font-bold text-base tracking-wide">✦ YourStore</span>
          <nav className="hidden md:flex gap-8 text-sm font-sans">
            {["Home", "Shop", "Collections", "Blog", "About"].map((item) => (
              <span
                key={item}
                className={`cursor-pointer transition-opacity ${item === "Blog" ? "opacity-100 border-b border-white pb-0.5" : "opacity-50 hover:opacity-90"}`}
              >
                {item}
              </span>
            ))}
          </nav>
          <div className="text-sm opacity-50 font-sans">🔍 Cart (0)</div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto px-6 pt-4">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-sans">
          <span className="hover:text-gray-600 cursor-pointer">Home</span>
          <span>›</span>
          <span className="hover:text-gray-600 cursor-pointer">News</span>
          <span>›</span>
          <span className="text-gray-500 truncate">{draft.title}</span>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-6 py-8 pb-24">
        {/* Featured hero image */}
        <div
          className="relative w-full rounded-2xl overflow-hidden bg-gray-100 mb-8"
          style={{ aspectRatio: "16/8" }}
        >
          {showFeaturedLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
              <p className="text-sm text-gray-400 font-sans">
                Generating featured image…
              </p>
              <p className="text-xs text-gray-300 font-sans">20–30 seconds</p>
            </div>
          )}
          {featuredSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featuredSrc}
              alt={draft.title}
              className="w-full h-full object-cover"
            />
          )}
          {showFeaturedError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-50">
              <p className="text-sm text-red-400 font-sans">⚠ Image failed</p>
              <button
                onClick={() =>
                  draft.image_prompt && generate(draft.image_prompt)
                }
                className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-full font-sans"
              >
                Retry
              </button>
            </div>
          )}
          {!draft.image_prompt && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-gray-300 font-sans">
                No featured image prompt
              </p>
            </div>
          )}

          {/* Regenerate / Save buttons */}
          {draft.image_prompt && (
            <div className="absolute top-3 right-3 z-10 flex gap-2 font-sans">
              <button
                type="button"
                onClick={() => generate(draft.image_prompt!)}
                className="text-xs bg-white/90 hover:bg-white text-gray-900 px-3 py-1.5 rounded-full"
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={saveFeaturedImage}
                disabled={savingImage}
                className="text-xs bg-gray-900/90 hover:bg-gray-900 text-white px-3 py-1.5 rounded-full disabled:opacity-50"
              >
                {savingImage ? "Saving..." : "Save Image"}
              </button>
            </div>
          )}

          {/* Title + meta overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <h1
              className="text-white font-bold leading-tight"
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
                fontFamily: "Georgia, serif",
              }}
            >
              {draft.title}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-white/70 text-sm font-sans">
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
        {draft.excerpt && (
          <p className="text-xl text-gray-500 italic leading-relaxed border-l-4 border-gray-200 pl-5 mb-10">
            {draft.excerpt}
          </p>
        )}

        {/* Body segments with inline images */}
        {segments.map((seg, i) =>
          seg.type === "image" ? (
            <InlineImageBlock
              key={i}
              prompt={seg.content}
              images={images}
              onRetry={generate}
            />
          ) : (
            <div
              key={i}
              className="
                text-gray-800 leading-relaxed
                [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:leading-tight [&_h1]:text-gray-900
                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-gray-900
                [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-gray-800
                [&_p]:text-base [&_p]:leading-8 [&_p]:mb-4
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
                [&_li]:mb-1.5 [&_li]:leading-7
                [&_strong]:font-bold [&_em]:italic
                [&_a]:text-indigo-600 [&_a]:underline
                [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-500
              "
              dangerouslySetInnerHTML={{ __html: seg.content }}
            />
          ),
        )}

        {/* Inline image tip */}
        <div className="mt-10 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
          <p className="text-xs text-indigo-600 font-sans">
            <strong>💡 Tip:</strong> Type{" "}
            <code className="bg-indigo-100 px-1.5 py-0.5 rounded font-mono text-indigo-700">
              {"[[IMAGE: description]]"}
            </code>{" "}
            anywhere in the editor above to auto-generate and embed an image
            here.
          </p>
        </div>

        {/* Tags */}
        {draft.tags && draft.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-gray-100">
            {draft.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-full cursor-pointer transition font-sans"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Share row */}
        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-100 font-sans">
          <span className="text-sm text-gray-400">Share:</span>
          {["Twitter", "Facebook", "LinkedIn"].map((s) => (
            <span
              key={s}
              className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer underline"
            >
              {s}
            </span>
          ))}
        </div>
      </article>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const SHOPIFY_BLOGS = [
  { id: "news", label: "News" },
  { id: "tutorials", label: "Tutorials" },
  { id: "updates", label: "Product Updates" },
];

function SettingsSidebar({
  draft,
  tagsInput,
  setTagsInput,
  field,
  onClose,
}: {
  draft: Draft;
  tagsInput: string;
  setTagsInput: (v: string) => void;
  field: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-xl z-30 overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
        <h2 className="font-semibold text-gray-800 text-sm">Post Settings</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Blog
          </label>
          <select
            value={draft.blog_id ?? ""}
            onChange={(e) => field("blog_id", e.target.value || null)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Select a blog…</option>
            {SHOPIFY_BLOGS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Tags
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="tag1, tag2, tag3"
          />
          <p className="text-xs text-gray-400 mt-1">Comma separated</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Excerpt
          </label>
          <textarea
            value={draft.excerpt ?? ""}
            onChange={(e) => field("excerpt", e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            placeholder="Short summary…"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            SEO Title
          </label>
          <input
            type="text"
            value={draft.seo_title ?? ""}
            onChange={(e) => field("seo_title", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="60 chars recommended"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            SEO Description
          </label>
          <textarea
            value={draft.seo_description ?? ""}
            onChange={(e) => field("seo_description", e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            placeholder="160 chars recommended"
          />
        </div>

        {/* Google SERP preview */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-[#1a0dab] text-sm font-medium truncate">
            {draft.seo_title || draft.title}
          </p>
          <p className="text-[#006621] text-xs">
            yourshop.myshopify.com/blogs/news/...
          </p>
          <p className="text-gray-600 text-xs line-clamp-2 mt-0.5">
            {draft.seo_description || "Meta description preview"}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Publish To
          </label>
          <div className="space-y-2">
            {["Shopify Blog", "Medium", "Blogger"].map((p) => (
              <label
                key={p}
                className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
              >
                <input type="checkbox" defaultChecked className="rounded" />
                {p}
              </label>
            ))}
          </div>
        </div>

        {draft.image_prompt && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Image Prompt
            </label>
            <p className="text-xs text-gray-400 italic leading-relaxed">
              {draft.image_prompt}
            </p>
          </div>
        )}

        {/* View on Shopify link in sidebar when published */}
        {draft.status === "published" && draft.shopify_url && (
          <div className="pt-2 border-t border-gray-100">
            <a
              href={draft.shopify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <span>🛍</span>
              View on Shopify ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DraftEditor({ initialDraft }: { initialDraft: Draft }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState(
    (initialDraft.tags ?? []).join(", "),
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Poll while generating or publishing ──
  // ── Poll while generating or publishing ──
  useEffect(() => {
    if (draft.status !== "generating" && draft.status !== "publishing") return;

    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/draft-status?id=${draft.id}`);
      if (res.ok) {
        const updated: Draft = await res.json();

        if (updated.status !== draft.status) {
          setDraft((prev) => ({
            ...prev,
            status: updated.status,
            ...(updated.shopify_url
              ? { shopify_url: updated.shopify_url }
              : {}),
            ...(updated.image_url ? { image_url: updated.image_url } : {}),
          }));
          setTagsInput((updated.tags ?? []).join(", "));
          if (pollRef.current) clearInterval(pollRef.current);

          // ── Redirect to Shopify admin when published ──
          if (updated.status === "published") {
            window.open(
              "https://admin.shopify.com/store/buddy-store-8866/content/articles?selectedView=all",
              "_blank",
            );
          }
        }
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [draft.status, draft.id]);

  function field<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  // Collect all image prompts
  const segments = parseSegments(draft.content_html ?? "");
  const inlinePrompts = segments
    .filter((s) => s.type === "image")
    .map((s) => s.content);
  const allPrompts = [
    ...(draft.image_prompt ? [draft.image_prompt] : []),
    ...inlinePrompts,
  ];
  const { images, generate } = useImages(allPrompts);
  const hasUnsavedFeaturedPreview = Boolean(
    draft.image_prompt && images[draft.image_prompt]?.src?.startsWith("blob:"),
  );

  async function save() {
    setSaving(true);
    setSaveMsg(null);
    const res = await fetch("/api/save-draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: draft.id,
        title: draft.title,
        content_html: draft.content_html,
        excerpt: draft.excerpt,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        seo_title: draft.seo_title,
        seo_description: draft.seo_description,
        blog_id: draft.blog_id,
      }),
    });
    setSaving(false);
    setSaveMsg(res.ok ? "Saved ✓" : "Save failed");
    setTimeout(() => setSaveMsg(null), 3000);
  }

  async function saveFeaturedImage() {
    if (!draft.image_prompt) {
      alert("No image prompt to generate.");
      return;
    }

    setSavingImage(true);
    try {
      const currentPreviewSrc = draft.image_prompt
        ? images[draft.image_prompt]?.src
        : null;

      if (!currentPreviewSrc?.startsWith("blob:")) {
        if (draft.image_url) {
          throw new Error(
            "This image is already saved. Click Regenerate to create a new image, then Save Image.",
          );
        }
        throw new Error("Click Regenerate first, then Save Image.");
      }

      const imgBlob = await fetch(currentPreviewSrc).then((r) => r.blob());
      const form = new FormData();
      form.append("draft_id", draft.id);
      form.append("prompt", draft.image_prompt);
      form.append("image", imgBlob, "featured-image.png");
      const res = await fetch("/api/save-generated-image", {
        method: "POST",
        body: form,
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Image save failed");

      if (body.image_url) {
        setDraft((prev) => ({ ...prev, image_url: body.image_url }));
      }
      setSaveMsg("Image saved ✓");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Image save failed");
    } finally {
      setSavingImage(false);
    }
  }

  async function publish() {
    setPublishing(true);
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft_id: draft.id }),
    });
    if (res.ok) {
      setDraft((prev) => ({ ...prev, status: "publishing" }));
    } else {
      const b = await res.json().catch(() => ({}));
      alert(b.error ?? "Publish failed");
    }
    setPublishing(false);
  }

  async function deleteDraft() {
    if (deleting) return;
    const confirmed = window.confirm(
      "Delete this draft permanently? This cannot be undone.",
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/delete-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_id: draft.id }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Delete failed");

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  // ── Generating spinner ──
  if (draft.status === "generating") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium">
            AI is generating your post…
          </p>
          <p className="text-gray-400 text-sm mt-1">
            This usually takes 15–30 seconds
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block text-indigo-600 text-sm underline"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Top toolbar ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-13 py-2">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-gray-700 text-sm"
            >
              ← Drafts
            </Link>
            <span className="text-gray-200">|</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                draft.status === "published"
                  ? "bg-green-100 text-green-700"
                  : draft.status === "draft"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {draft.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {saveMsg && (
              <span className="text-xs text-green-600">{saveMsg}</span>
            )}

            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition"
            >
              ⚙ Settings
            </button>

            <button
              onClick={saveFeaturedImage}
              disabled={savingImage || !hasUnsavedFeaturedPreview}
              className="text-sm px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
            >
              {savingImage ? "Saving image..." : "Save AI Image"}
            </button>

            <button
              onClick={save}
              disabled={saving || draft.status === "published"}
              className="text-sm px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
            >
              {saving ? "Saving…" : "Save"}
            </button>

            <button
              onClick={deleteDraft}
              disabled={deleting || publishing}
              className="text-sm px-4 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 transition"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>

            {/* Publish button OR View on Shopify link */}
            {draft.status === "published" && draft.shopify_url ? (
              <a
                href={draft.shopify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition whitespace-nowrap"
              >
                🛍 View on Shopify ↗
              </a>
            ) : (
              <button
                onClick={publish}
                disabled={
                  deleting ||
                  publishing ||
                  draft.status === "published" ||
                  draft.status === "publishing"
                }
                className="text-sm px-4 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
              >
                {draft.status === "publishing"
                  ? "Publishing…"
                  : draft.status === "published"
                    ? "✓ Published"
                    : "Publish →"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tiptap editor panel ── */}
      <div className="max-w-3xl mx-auto px-6 pt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <input
              type="text"
              value={draft.title}
              onChange={(e) => field("title", e.target.value)}
              className="w-full text-2xl font-bold text-gray-900 border-none outline-none focus:ring-0 placeholder:text-gray-300"
              placeholder="Post title…"
            />
          </div>

          <div className="border-t border-gray-100 mx-6" />

          <div className="px-2 pb-4">
            <RichEditorClient
              content={draft.content_html ?? ""}
              onChange={(html) => field("content_html", html)}
            />
          </div>

          <div className="mx-6 mb-4 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl">
            <p className="text-xs text-indigo-600">
              <strong>💡</strong> Type{" "}
              <code className="bg-indigo-100 px-1.5 py-0.5 rounded font-mono text-indigo-700 text-xs">
                {"[[IMAGE: description]]"}
              </code>{" "}
              anywhere to auto-generate an image in the preview below.
            </p>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="max-w-3xl mx-auto px-6 py-6 flex items-center gap-4">
        <div className="flex-1 border-t border-gray-300" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
          ↓ Live Preview
        </span>
        <div className="flex-1 border-t border-gray-300" />
      </div>

      {/* ── Blog preview ── */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
          <BlogPreview
            draft={draft}
            images={images}
            generate={generate}
            saveFeaturedImage={saveFeaturedImage}
            savingImage={savingImage}
            segments={segments}
          />
        </div>
      </div>

      {/* ── Settings sidebar ── */}
      {sidebarOpen && (
        <SettingsSidebar
          draft={draft}
          tagsInput={tagsInput}
          setTagsInput={setTagsInput}
          field={field}
          onClose={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
