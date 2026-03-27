// Database types
export interface ResumeJob {
  id: string;
  status: "pending" | "processing" | "success" | "failure";
  pdf_url: string | null;
  error: string | null;
  company_name: string | null;
  mode: string;
  updated_at: string;
}

// Notification request bodies
export type NotificationBody =
  & {
    companyName: string | null;
    mode: string;
  }
  & ({
    pdfUrl?: never;
    errorMessage?: never;
  } | {
    pdfUrl: string;
  } | {
    errorMessage: string;
  });

export interface NotificationSendResult {
  endpoint: string;
  status: number;
  responseSnippet: string;
  durationMs: number;
}
