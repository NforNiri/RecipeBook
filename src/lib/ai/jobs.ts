import { createServerSupabaseClient } from "@/lib/db/server";
import type { AiJobType, Json } from "@/types/db";

/** Cast any serialisable value to Supabase's Json type. */
function toJson<T>(v: T): Json {
  return v as unknown as Json;
}

interface RunAiJobOptions<T> {
  userId: string;
  jobType: AiJobType;
  /** Serialisable summary of the input (e.g. the URL or a short label). */
  input: Record<string, unknown>;
  /** The function that calls the AI and returns the result + optional token count. */
  fn: () => Promise<{ result: T; tokensUsed?: number }>;
}

/**
 * Thin wrapper that bookends every AI call with an `ai_jobs` row.
 * Inserts a `pending` row, runs `fn`, then updates to `success` or `error`.
 * Always re-throws on failure after recording the error.
 */
export async function runAiJob<T>({
  userId,
  jobType,
  input,
  fn,
}: RunAiJobOptions<T>): Promise<T> {
  const supabase = await createServerSupabaseClient();

  const { data: jobRow, error: insertError } = await supabase
    .from("ai_jobs")
    .insert({
      user_id: userId,
      job_type: jobType,
      input: toJson(input),
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !jobRow) {
    throw new Error(`Failed to create ai_jobs row: ${insertError?.message}`);
  }

  const jobId = jobRow.id;

  try {
    const { result, tokensUsed } = await fn();

    await supabase
      .from("ai_jobs")
      .update({
        status: "success",
        output: toJson(result),
        tokens_used: tokensUsed ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await supabase
      .from("ai_jobs")
      .update({
        status: "error",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    throw err;
  }
}
