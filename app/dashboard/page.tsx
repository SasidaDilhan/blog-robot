import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { Draft } from "../../lib/supabase/types";

const STATUS_BADGE: Record<string, string> = {
  generating: "bg-yellow-100 text-yellow-800",
  draft: "bg-blue-100 text-blue-800",
  publishing: "bg-purple-100 text-purple-800",
  published: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: drafts, error } = await supabase
    .from("drafts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Blog Drafts</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-gray-600 hover:text-gray-900 underline">
              Sign out
            </button>
          </form>
          <Link
            href="/new"
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            + New Post
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <p className="text-red-600 mb-4">
            Failed to load drafts: {error.message}
          </p>
        )}

        {!drafts || drafts.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-lg">No drafts yet.</p>
            <Link
              href="/new"
              className="mt-4 inline-block text-indigo-600 underline"
            >
              Generate your first post
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">
                    Title
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">
                    Created
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(drafts as Draft[]).map((draft) => (
                  <tr key={draft.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {draft.title}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[draft.status] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {draft.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(draft.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {draft.status === "generating" ? (
                        <span className="text-gray-400 italic">
                          Processing…
                        </span>
                      ) : (
                        <Link
                          href={`/draft/${draft.id}`}
                          className="text-indigo-600 hover:underline font-medium"
                        >
                          {draft.status === "published" ? "View" : "Edit →"}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
