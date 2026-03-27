import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { NotifierError } from "./errors.ts";
import { ResumeJob } from "./types.ts";

export function createSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string,
): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey);
}

export async function fetchLatestJob(
  client: SupabaseClient,
  requestId: string,
): Promise<ResumeJob> {
  const startedAt = Date.now();

  console.log(JSON.stringify({
    level: "info",
    stage: "database_fetch",
    event: "database.fetch.start",
    requestId,
    timestamp: new Date().toISOString(),
    table: "resume_jobs",
    orderBy: "updated_at DESC",
  }));

  const { data, error } = await client
    .from("resume_jobs")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error(JSON.stringify({
      level: "error",
      stage: "database_fetch",
      event: "database.fetch.error",
      requestId,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      message: error.message,
      code: error.code ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
    }));

    throw new NotifierError({
      message: `Database error: ${error.message}`,
      stage: "database_fetch",
      details: {
        code: error.code ?? null,
        details: error.details ?? null,
        hint: error.hint ?? null,
      },
    });
  }

  console.log(JSON.stringify({
    level: "info",
    stage: "database_fetch",
    event: "database.fetch.success",
    requestId,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    jobId: (data as ResumeJob).id,
    status: (data as ResumeJob).status,
    updatedAt: (data as ResumeJob).updated_at,
  }));

  return data as ResumeJob;
}
