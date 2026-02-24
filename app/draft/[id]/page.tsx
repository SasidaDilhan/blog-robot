// src/app/draft/[id]/page.tsx

import { redirect, notFound } from "next/navigation";
import DraftEditor from "./DraftEditor";
import { createSupabaseServerClient } from "../../../lib/superbase/server";
import { Draft } from "../../../lib/superbase/types";

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

  const { data } = await supabase
    .from("drafts")
    .select("*")
    .eq("id", id)
    .single();

  const draft = data as Draft | null;
  if (!draft) notFound();

  return <DraftEditor initialDraft={draft} />;
}
