// src/lib/supabase/helpers.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Draft } from './types'

type AnyUpdate = Partial<Omit<Draft, 'id' | 'user_id' | 'created_at'>>

type AnyInsert = {
  user_id: string
  title: string
  status?: Draft['status']
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(supabase: SupabaseClient): any {
  return (supabase as any).from('drafts')
}

export function updateDraft(supabase: SupabaseClient, values: AnyUpdate) {
  return table(supabase).update(values)
}

export function insertDraft(supabase: SupabaseClient, values: AnyInsert) {
  return table(supabase).insert(values)
}