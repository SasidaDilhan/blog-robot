// src/app/draft/[id]/page.tsx

import { redirect, notFound } from "next/navigation";
import DraftEditor from "./DraftEditor";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { Draft } from "../../../lib/supabase/types";

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>; // ← Promise in Next.js 15
}) {
  const { id } = await params; // ← must await before accessing

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let draft: Draft | null = null;

  // Fly + Supabase can show a short delay right after insert; retry briefly.
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data } = await supabase
      .from("drafts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    draft = (data as Draft | null) ?? null;
    if (draft) break;

    await sleep(250);
  }

  if (!draft) notFound();

  return <DraftEditor initialDraft={draft} />;
}
