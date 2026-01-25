import { ResumeJob, NotificationBody } from './types.ts'

export function buildNotificationBody(job: ResumeJob): NotificationBody {
  const baseBody = {
    companyName: job.company_name,
    mode: job.mode.toUpperCase()
  }

  switch (job.status) {
    case 'pending':
    case 'processing':
      return baseBody

    case 'success':
      return {
        ...baseBody,
        pdfUrl: job.pdf_url!
      }

    case 'failure':
      return {
        ...baseBody,
        errorMessage: job.error!
      }

    default:
      throw new Error(`Unknown status: ${job.status}`)
  }
}

export async function sendNotification(
  apiBaseUrl: string,
  accessToken: string,
  notificationBody: NotificationBody
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/notification/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(notificationBody)
  })

  if (!response.ok) {
    throw new Error(`Notification failed: ${response.status}`)
  }
}