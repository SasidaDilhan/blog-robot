"use client";

import { Draft } from "../../../../lib/supabase/types";

const SHOPIFY_BLOGS = [
  { id: "news", label: "News" },
  { id: "tutorials", label: "Tutorials" },
  { id: "updates", label: "Product Updates" },
];

export default function SettingsSidebar({
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
            <option value="">Select a blog...</option>
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
            placeholder="Short summary..."
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

        {draft.status === "published" && draft.shopify_url && (
          <div className="pt-2 border-t border-gray-100">
            <a
              href={draft.shopify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <span>View on Shopify</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
