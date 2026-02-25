// src/lib/supabase/types.ts

export type DraftStatus =
  | "generating"
  | "draft"
  | "publishing"
  | "published"
  | "error";

export interface Draft {
  id: string;
  user_id: string;
  title: string;
  status: DraftStatus;
  content_html: string | null;
  excerpt: string | null;
  tags: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  image_prompt: string | null;
  image_url: string | null;
  blog_id: string | null;
  created_at: string;
  updated_at: string;
  shopify_url?: string | null;
  shopify_article_id?: string | null;
}

// Matches exactly what @supabase/supabase-js expects for typed clients
export type Database = {
  public: {
    Tables: {
      drafts: {
        Row: Draft;
        Insert: {
          id?: string; // optional — db generates it
          user_id: string;
          title: string;
          status?: DraftStatus; // optional — db has default
          content_html?: string | null;
          excerpt?: string | null;
          tags?: string[] | null;
          seo_title?: string | null;
          seo_description?: string | null;
          image_prompt?: string | null;
          image_url?: string | null;
          blog_id?: string | null;
          created_at?: string; // optional — db has default
          updated_at?: string; // optional — db has default
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          status?: DraftStatus;
          content_html?: string | null;
          excerpt?: string | null;
          tags?: string[] | null;
          seo_title?: string | null;
          seo_description?: string | null;
          image_prompt?: string | null;
          image_url?: string | null;
          blog_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
