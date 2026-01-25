import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2"
import { ResumeJob } from './types.ts'

export function createSupabaseClient(supabaseUrl: string, supabaseKey: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey)
}

export async function fetchLatestJob(
  client: SupabaseClient
): Promise<ResumeJob> {
  const { data, error } = await client
    .from('resume_jobs')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return data as ResumeJob
}