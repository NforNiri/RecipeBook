/**
 * Hand-written Supabase database types.
 * Regenerate with:
 *   npx supabase gen types typescript --project-id <your-project-id> > src/types/db.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RecipeCategory =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "dessert"
  | "baking"
  | "soup"
  | "salad"
  | "sauce"
  | "drink"
  | "snack"
  | "other";

export type SourceType = "original" | "url" | "photo" | "family" | "cookbook";
export type AiJobType = "url_import" | "photo_import" | "upgrade" | "swap";
export type AiJobStatus = "pending" | "success" | "error";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: "owner" | "family";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role?: "owner" | "family";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          role?: "owner" | "family";
          updated_at?: string;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          owner_id: string;
          slug: string;
          title: string;
          description: string | null;
          hero_image_url: string | null;
          category: RecipeCategory;
          tags: string[];
          source_type: SourceType | null;
          source_value: string | null;
          prep_minutes: number | null;
          cook_minutes: number | null;
          servings: number | null;
          ingredients: Json;
          instructions: Json;
          notes: Json | null;
          is_public: boolean;
          public_share_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          slug: string;
          title: string;
          description?: string | null;
          hero_image_url?: string | null;
          category: RecipeCategory;
          tags?: string[];
          source_type?: SourceType | null;
          source_value?: string | null;
          prep_minutes?: number | null;
          cook_minutes?: number | null;
          servings?: number | null;
          ingredients?: Json;
          instructions?: Json;
          notes?: Json | null;
          is_public?: boolean;
          public_share_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          title?: string;
          description?: string | null;
          hero_image_url?: string | null;
          category?: RecipeCategory;
          tags?: string[];
          source_type?: SourceType | null;
          source_value?: string | null;
          prep_minutes?: number | null;
          cook_minutes?: number | null;
          servings?: number | null;
          ingredients?: Json;
          instructions?: Json;
          notes?: Json | null;
          is_public?: boolean;
          public_share_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      owner_ratings: {
        Row: {
          recipe_id: string;
          stars: number;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          recipe_id: string;
          stars: number;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          stars?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      guest_ratings: {
        Row: {
          id: string;
          recipe_id: string;
          fingerprint: string;
          guest_name: string | null;
          stars: number;
          comment: string | null;
          ip_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          fingerprint: string;
          guest_name?: string | null;
          stars: number;
          comment?: string | null;
          ip_hash?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      family_ratings: {
        Row: {
          recipe_id: string;
          user_id: string;
          stars: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          recipe_id: string;
          user_id: string;
          stars: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stars?: number;
          comment?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      cook_log: {
        Row: {
          id: string;
          recipe_id: string;
          user_id: string;
          cooked_at: string;
          note: string | null;
          result_rating: number | null;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          user_id: string;
          cooked_at?: string;
          note?: string | null;
          result_rating?: number | null;
        };
        Update: {
          note?: string | null;
          result_rating?: number | null;
        };
        Relationships: [];
      };
      invites: {
        Row: {
          id: string;
          email: string;
          invited_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          invited_by: string;
          created_at?: string;
        };
        Update: {
          email?: string;
        };
        Relationships: [];
      };
      ai_jobs: {
        Row: {
          id: string;
          user_id: string;
          job_type: AiJobType;
          input: Json;
          output: Json | null;
          status: AiJobStatus;
          error_message: string | null;
          tokens_used: number | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_type: AiJobType;
          input: Json;
          output?: Json | null;
          status?: AiJobStatus;
          error_message?: string | null;
          tokens_used?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          output?: Json | null;
          status?: AiJobStatus;
          error_message?: string | null;
          tokens_used?: number | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
