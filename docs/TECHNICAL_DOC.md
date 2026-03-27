# Job Notifier Technical Documentation

`job-notifier` contains the Supabase Edge Function that forwards resume-job status updates into `portfolio-api`, which then delivers the user-facing notification.

## Repository Scope

This repository only contains the Supabase function code for `notifier`.

```text
supabase/
  functions/
    notifier/
      index.ts
      deno.json
      lib/
        database.ts
        errors.ts
        notification.ts
        types.ts
```

## Runtime Flow

When `notifier` is invoked it:

1. reads the required environment variables
2. creates a Supabase client with the service role key
3. fetches the latest row from `resume_jobs`, ordered by `updated_at DESC`
4. builds a notification body from the job status
5. sends the request to the notification API using `X-Api-Key`

The function returns `OK` with status `200` on success.

## Entry Point

The HTTP entrypoint is:

- `supabase/functions/notifier/index.ts`

Behavior implemented there:

- handles `OPTIONS` requests for CORS
- validates required env vars
- calls the database helper
- builds the outgoing request body
- sends the notification
- emits structured logs with a per-request `requestId`
- maps failures into the upstream status code when available, otherwise `500`

## Supabase Dependency

The function reads from the `resume_jobs` table and currently fetches only:

- the latest row by `updated_at`

Expected fields used by the function:

- `id`
- `status`
- `pdf_url`
- `error`
- `company_name`
- `mode`
- `updated_at`

Current status handling:

- `pending`
- `processing`
- `success`
- `failure`

## Notification Payload Mapping

The function maps `resume_jobs.status` into the outgoing JSON body sent to `portfolio-api`.

### `pending` or `processing`

```json
{
  "companyName": "Acme",
  "mode": "OPTIMIZED"
}
```

### `success`

```json
{
  "companyName": "Acme",
  "mode": "OPTIMIZED",
  "pdfUrl": "https://..."
}
```

### `failure`

```json
{
  "companyName": "Acme",
  "mode": "OPTIMIZED",
  "errorMessage": "Compilation failed"
}
```

`mode` is uppercased before the request is sent.

## API Calls

The function performs one outbound HTTP call:

- `POST {API_BASE_URL}/notification/send`

From the current code, `API_BASE_URL` should usually be the API root that already includes `/api`, for example:

```bash
API_BASE_URL=http://localhost:5000/api
```

## Required Environment Variables

Provide these values through an env file such as `.env.local`:

```bash
API_BASE_URL=http://localhost:5000/api
API_KEY=your-backend-api-key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Purpose of each variable:

- `API_BASE_URL`: base URL for `portfolio-api`
- `API_KEY`: API key sent as `X-Api-Key` for notification requests
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: service key used to query `resume_jobs`

If any are missing, the function returns `500`.

## Local Development

Prerequisites:

- Supabase CLI
- access to the target Supabase project
- valid `API_KEY` for `portfolio-api`

Serve locally from the repository root:

```bash
supabase functions serve notifier --env-file .env.local
```

Invoke manually:

```bash
curl -i --request POST http://127.0.0.1:54321/functions/v1/notifier
```

The function does not require a request body.

## Deployment

Deploy with the Supabase CLI:

```bash
supabase functions deploy notifier
```

Make sure the deployed Supabase project also has the required environment variables configured.

## Operational Notes

- The function does not accept a job id and does not scope itself to a specific event payload.
- It always fetches the latest row from `resume_jobs`.
- This means correctness depends on updates arriving in a way that makes “latest updated row” the intended record.
- Notification delivery errors propagate as function failures.
- Notification API failures propagate the upstream HTTP status code.
- Logs are emitted in structured JSON with `requestId`, `stage`, and `event` for Supabase debugging.
- CORS is enabled for browser-style preflight handling.
