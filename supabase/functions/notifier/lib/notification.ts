import { NotifierError } from "./errors.ts";
import {
  NotificationBody,
  NotificationSendResult,
  ResumeJob,
} from "./types.ts";

function toSnippet(body: string, maxLength = 500): string {
  return body.length > maxLength ? `${body.slice(0, maxLength)}...` : body;
}

export function buildNotificationBody(job: ResumeJob): NotificationBody {
  if (!job.mode) {
    throw new NotifierError({
      message: `Missing mode for job ${job.id}`,
      stage: "build_notification_body",
    });
  }

  const baseBody = {
    companyName: job.company_name,
    mode: job.mode.toUpperCase(),
  };

  switch (job.status) {
    case "pending":
    case "processing":
      return baseBody;

    case "success":
      if (!job.pdf_url) {
        throw new NotifierError({
          message: `Missing pdf_url for success job ${job.id}`,
          stage: "build_notification_body",
        });
      }

      return {
        ...baseBody,
        pdfUrl: job.pdf_url,
      };

    case "failure":
      if (!job.error) {
        throw new NotifierError({
          message: `Missing error message for failure job ${job.id}`,
          stage: "build_notification_body",
        });
      }

      return {
        ...baseBody,
        errorMessage: job.error,
      };

    default:
      throw new NotifierError({
        message: `Unknown status: ${job.status}`,
        stage: "build_notification_body",
      });
  }
}

export async function sendNotification(
  apiBaseUrl: string,
  apiKey: string,
  notificationBody: NotificationBody,
): Promise<NotificationSendResult> {
  const endpoint = `${apiBaseUrl}/notification/send`;
  const start = Date.now();
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notificationBody),
    });
  } catch (error) {
    throw new NotifierError({
      message: "Notification request failed before receiving response",
      stage: "notification_send",
      details: {
        endpoint,
        networkError: error instanceof Error
          ? error.message
          : "Unknown network error",
      },
    });
  }

  const rawResponseBody = await response.text();
  const responseSnippet = toSnippet(rawResponseBody);

  if (!response.ok) {
    throw new NotifierError({
      message: `Notification failed: ${response.status}`,
      stage: "notification_send",
      status: response.status,
      details: {
        endpoint,
        responseSnippet,
      },
    });
  }

  return {
    endpoint,
    status: response.status,
    responseSnippet,
    durationMs: Date.now() - start,
  };
}
