# Job Notifier

Technical deep dive: [docs/TECHNICAL_DOC.md](docs/TECHNICAL_DOC.md)

I built `job-notifier` to solve one specific problem in the resume pipeline: users should not be left guessing while a resume is being generated, optimized, compiled, or delivered.

## Problem Statement

Resume generation is not instant. There are several moving parts between request creation and a usable PDF, and without a notification layer the process feels opaque. That makes the system feel unreliable even when the pipeline is actually working.

This repo exists to keep that process visible:

- when a resume job starts
- while it is still in progress
- when it fails
- when the final PDF is ready

## Why It Matters

- It gives the pipeline a clear feedback loop instead of silent background processing.
- It improves trust in the end-to-end workflow.
- It separates user-facing status updates from the resume compilation mechanics.

## Role In The System

`job-notifier` sits after resume job state changes:

1. `portfolio-api` initiates resume generation.
2. `latex-compiler` and Supabase update the `resume_jobs` state.
3. A Supabase trigger invokes this Edge Function.
4. This function sends a status-aware notification through `portfolio-api`.

## How It Works

At a high level, the function:

- reads the latest resume job from Supabase
- maps the job status into a notification payload
- forwards that payload to the notification endpoint with `X-Api-Key`

## Quickstart

```bash
supabase functions serve notifier --env-file .env.local
```

Then invoke it locally with:

```bash
curl -i --request POST http://127.0.0.1:54321/functions/v1/notifier
```

For environment variables, payload mapping, deployment, and operational notes, see [docs/TECHNICAL_DOC.md](docs/TECHNICAL_DOC.md).
