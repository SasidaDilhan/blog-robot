"use client";

import { Draft } from "../../../../lib/supabase/types";
import InlineImageBlock from "./InlineImageBlock";

interface ImgState {
  src: string | null;
  loading: boolean;
  error: boolean;
}

export default function BlogPreview({
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
      <div className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
          <span className="font-bold text-base tracking-wide">YourStore</span>
          <nav className="hidden md:flex gap-8 text-sm font-sans">
            {["Home", "Shop", "Collections", "Blog", "About"].map((item) => (
              <span
                key={item}
                className={`cursor-pointer transition-opacity ${
                  item === "Blog"
                    ? "opacity-100 border-b border-white pb-0.5"
                    : "opacity-50 hover:opacity-90"
                }`}
              >
                {item}
              </span>
            ))}
          </nav>
          <div className="text-sm opacity-50 font-sans">Cart (0)</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-4">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-sans">
          <span className="hover:text-gray-600 cursor-pointer">Home</span>
          <span>&gt;</span>
          <span className="hover:text-gray-600 cursor-pointer">News</span>
          <span>&gt;</span>
          <span className="text-gray-500 truncate">{draft.title}</span>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-6 py-8 pb-24">
        <div
          className="relative w-full rounded-2xl overflow-hidden bg-gray-100 mb-8"
          style={{ aspectRatio: "16/8" }}
        >
          {showFeaturedLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
              <p className="text-sm text-gray-400 font-sans">
                Generating featured image...
              </p>
              <p className="text-xs text-gray-300 font-sans">20-30 seconds</p>
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
              <p className="text-sm text-red-400 font-sans">Image failed</p>
              <button
                onClick={() => draft.image_prompt && generate(draft.image_prompt)}
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

          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
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

        {draft.excerpt && (
          <p className="text-xl text-gray-500 italic leading-relaxed border-l-4 border-gray-200 pl-5 mb-10">
            {draft.excerpt}
          </p>
        )}

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

        <div className="mt-10 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
          <p className="text-xs text-indigo-600 font-sans">
            <strong>Tip:</strong> Type{" "}
            <code className="bg-indigo-100 px-1.5 py-0.5 rounded font-mono text-indigo-700">
              {"[[IMAGE: description]]"}
            </code>{" "}
            anywhere in the editor above to auto-generate and embed an image
            here.
          </p>
        </div>

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
