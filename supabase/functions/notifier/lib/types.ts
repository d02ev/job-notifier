// Database types
export interface ResumeJob {
  id: string
  status: 'pending' | 'processing' | 'success' | 'failure'
  pdf_url: string | null
  error: string | null
  company_name: string | null
  mode: string
  updated_at: string
}

// API authentication response
export interface AuthResponse {
  statusCode: number
  responseCode: string
  message: string
  token: {
    accessToken: string
    refreshToken: string
  }
}

// Notification request bodies
export type NotificationBody = {
  companyName: string | null
  mode: string
} & ({
  pdfUrl?: never
  errorMessage?: never
} | {
  pdfUrl: string
} | {
  errorMessage: string
})