import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { authenticateApi } from './lib/auth.ts'
import { createSupabaseClient, fetchLatestJob } from './lib/database.ts'
import { buildNotificationBody, sendNotification } from './lib/notification.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const apiBaseUrl = Deno.env.get('API_BASE_URL')
    const apiAuthUsername = Deno.env.get('API_AUTH_USERNAME')
    const apiAuthPassword = Deno.env.get('API_AUTH_PASSWORD')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!apiBaseUrl || !apiAuthUsername || !apiAuthPassword || !supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 1. Authenticate with API
    const accessToken = await authenticateApi(apiBaseUrl, apiAuthUsername, apiAuthPassword)

    // 2. Fetch latest job data
    const supabaseClient = createSupabaseClient(supabaseUrl, supabaseKey)
    const latestJob = await fetchLatestJob(supabaseClient)

    // 3. Build notification body
    const notificationBody = buildNotificationBody(latestJob)

    // 4. Send notification
    await sendNotification(apiBaseUrl, accessToken, notificationBody)

    // 5. Return success
    return new Response('OK', { status: 200 })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const status = errorMessage.includes('Authentication failed') ? 401 :
                  errorMessage.includes('403') ? 403 : 500

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
    )
  }
})