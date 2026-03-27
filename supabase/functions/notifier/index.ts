import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, fetchLatestJob } from "./lib/database.ts";
import { NotifierError } from "./lib/errors.ts";
import { buildNotificationBody, sendNotification } from "./lib/notification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

function logInfo(
  requestId: string,
  stage: string,
  event: string,
  details: Record<string, unknown> = {},
): void {
  console.log(JSON.stringify({
    level: "info",
    requestId,
    stage,
    event,
    timestamp: new Date().toISOString(),
    ...details,
  }));
}

function logError(
  requestId: string,
  stage: string,
  event: string,
  details: Record<string, unknown> = {},
): void {
  console.error(JSON.stringify({
    level: "error",
    requestId,
    stage,
    event,
    timestamp: new Date().toISOString(),
    ...details,
  }));
}

function jsonResponse(
  payload: Record<string, unknown>,
  status: number,
): Response {
  return new Response(
    JSON.stringify(payload),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    },
  );
}

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  logInfo(requestId, "invocation_start", "notifier.invocation.start", {
    method: req.method,
    path: new URL(req.url).pathname,
  });

  if (req.method === "OPTIONS") {
    logInfo(requestId, "preflight", "notifier.invocation.preflight");
    return new Response("ok", { headers: corsHeaders });
  }

  let stage = "env_validation";

  try {
    // Get environment variables
    const apiBaseUrl = Deno.env.get("API_BASE_URL");
    const apiKey = Deno.env.get("API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const envPresence = {
      API_BASE_URL: Boolean(apiBaseUrl),
      API_KEY: Boolean(apiKey),
      SUPABASE_URL: Boolean(supabaseUrl),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(supabaseKey),
    };

    logInfo(requestId, stage, "notifier.env.validated", { envPresence });

    if (!apiBaseUrl || !apiKey || !supabaseUrl || !supabaseKey) {
      logError(requestId, stage, "notifier.env.missing", { envPresence });
      return jsonResponse(
        { error: "Missing required environment variables", requestId },
        500,
      );
    }

    // 1. Fetch latest job data
    stage = "database_fetch";
    const supabaseClient = createSupabaseClient(supabaseUrl, supabaseKey);
    const latestJob = await fetchLatestJob(supabaseClient, requestId);

    // 2. Build notification body
    stage = "build_notification_body";
    const notificationBody = buildNotificationBody(latestJob);
    logInfo(requestId, stage, "notifier.notification.body.built", {
      jobId: latestJob.id,
      jobStatus: latestJob.status,
      payloadKeys: Object.keys(notificationBody),
    });

    // 3. Send notification
    stage = "notification_send";
    logInfo(requestId, stage, "notifier.notification.send.start", {
      endpoint: `${apiBaseUrl}/notification/send`,
      payloadKeys: Object.keys(notificationBody),
    });
    const notificationResult = await sendNotification(
      apiBaseUrl,
      apiKey,
      notificationBody,
    );
    logInfo(
      requestId,
      stage,
      "notifier.notification.send.success",
      notificationResult,
    );

    // 4. Return success
    logInfo(requestId, "invocation_complete", "notifier.invocation.success", {
      durationMs: Date.now() - startedAt,
    });
    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    const notifierError = error instanceof NotifierError
      ? error
      : new NotifierError({
        message: error instanceof Error ? error.message : "Unknown error",
        stage,
        status: 500,
      });

    logError(requestId, notifierError.stage, "notifier.invocation.error", {
      durationMs: Date.now() - startedAt,
      mappedStatus: notifierError.status,
      message: notifierError.message,
      details: notifierError.details ?? null,
      stack: error instanceof Error ? error.stack : null,
    });

    return jsonResponse(
      { error: notifierError.message, requestId },
      notifierError.status,
    );
  }
});
