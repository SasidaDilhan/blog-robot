"use client";

interface ImgState {
  src: string | null;
  loading: boolean;
  error: boolean;
}

export default function InlineImageBlock({
  prompt,
  images,
  onRetry,
}: {
  prompt: string;
  images: Record<string, ImgState>;
  onRetry: (p: string) => void;
}) {
  const img = images[prompt];

  if (!img || img.loading) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-3 my-8">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Generating image...</p>
        <p className="text-xs text-gray-300">20-30 seconds</p>
      </div>
    );
  }

  if (img.error) {
    return (
      <div className="w-full aspect-video bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center justify-center gap-3 my-8">
        <p className="text-sm text-red-400">Image failed</p>
        <button
          onClick={() => onRetry(prompt)}
          className="text-xs bg-gray-900 text-white px-4 py-1.5 rounded-full"
        >
          Retry
        </button>
      </div>
    );
  }

  if (img.src) {
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
  }

  return null;
}
