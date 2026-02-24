import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/superbase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
