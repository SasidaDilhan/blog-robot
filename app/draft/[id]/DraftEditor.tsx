"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Draft } from "../../../lib/supabase/types";
import BlogPreview from "./components/BlogPreview";
import SettingsSidebar from "./components/SettingsSidebar";

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
    if (
      draft.status !== "generating" &&
      draft.status !== "publishing" &&
      !(draft.status === "draft" && !(draft.content_html ?? "").trim())
    ) {
      return;
    }

    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/draft-status?id=${draft.id}`);
      if (res.ok) {
        const updated: Draft = await res.json();
        const contentArrived =
          !(draft.content_html ?? "").trim() &&
          !!(updated.content_html ?? "").trim();

        if (updated.status !== draft.status || contentArrived) {
          setDraft((prev) => ({
            ...prev,
            ...updated,
          }));
          setTagsInput((updated.tags ?? []).join(", "));
          if (
            pollRef.current &&
            updated.status !== "generating" &&
            updated.status !== "publishing" &&
            !(updated.status === "draft" && !(updated.content_html ?? "").trim())
          ) {
            clearInterval(pollRef.current);
          }

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
