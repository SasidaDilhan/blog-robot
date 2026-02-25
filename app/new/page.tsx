'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewPostPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function waitForDraft(draftId: string) {
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`/api/draft-status?id=${draftId}`, {
        cache: 'no-store',
      })
      if (res.ok) return true
      await new Promise(resolve => setTimeout(resolve, 250))
    }
    return false
  }

  async function handleGenerate() {
    if (!title.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/request-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    const { draft_id } = await res.json()
    await waitForDraft(draft_id)
    window.location.href = `/draft/${draft_id}`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-lg">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">New Blog Post</h1>
        <p className="text-gray-500 text-sm mb-8">
          Enter a title and we'll generate the full post using AI.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Post Title
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
          placeholder="e.g. 10 Reasons to Use TypeScript in 2025"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
          disabled={loading}
        />

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={loading || !title.trim()}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Sending to AI…' : 'Generate Post'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Generation usually takes 15–30 seconds.
        </p>
      </div>
    </div>
  )
}
