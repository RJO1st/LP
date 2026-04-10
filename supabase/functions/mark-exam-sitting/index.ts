/**
 * index.ts — Edge Function: mark-exam-sitting
 *
 * HTTP endpoint invoked by pg_cron every 30 seconds to process queued Tier 3
 * exam marking jobs. Can also be manually invoked for testing/debugging.
 *
 * Handler accepts POST { jobId?: string } and dispatches to worker.processMarkingJob.
 *
 * POST /functions/v1/mark-exam-sitting
 *   Body: { jobId?: string }
 *   Returns: { ok: true, processed: N, message: string } | { error: string }
 *
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - OPENAI_API_KEY (for Tier 3 marking — TODO)
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { processMarkingJob, retryFailedJobs, cleanupOldJobs } from "./worker.ts";

// Restrict CORS to app domain via environment variable
const ALLOWED_ORIGIN = Deno.env.get('APP_URL') || 'https://launchpard.com';
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

/**
 * Main handler: dispatch marking job(s).
 *
 * If jobId is provided in request body, process that specific job.
 * Otherwise, process all queued jobs up to limit, then retry failed jobs,
 * then cleanup old completed jobs (weekly).
 */
serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[index] Missing Supabase env vars");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Initialize Supabase service client (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate JWT authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[index] Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Verify the JWT token using Supabase Auth
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[index] JWT validation failed:", authError?.message || "Invalid token");
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`[index] Authenticated user: ${user.id}`);

    // Parse request body
    let jobId: string | null = null;
    try {
      const body = await req.json();
      jobId = body?.jobId || null;
    } catch {
      // No JSON body — that's OK, we'll process all queued jobs
    }

    console.log(
      `[index] POST /mark-exam-sitting${jobId ? ` jobId=${jobId}` : " (batch mode)"}`
    );

    let processed = 0;
    let message = "";

    if (jobId) {
      // Process single job (manual trigger or cron with specific job)
      try {
        // Verify job ownership: fetch the job and check its sitting belongs to authenticated user
        const { data: job, error: jobError } = await supabase
          .from("exam_marking_jobs")
          .select("id, sitting_id")
          .eq("id", jobId)
          .single();

        if (jobError || !job) {
          throw new Error(`Job ${jobId} not found`);
        }

        // Verify the sitting belongs to the authenticated user
        const { data: sitting, error: sittingError } = await supabase
          .from("exam_sittings")
          .select("id, scholar_id")
          .eq("id", job.sitting_id)
          .single();

        if (sittingError || !sitting) {
          throw new Error(`Sitting for job ${jobId} not found`);
        }

        if (sitting.scholar_id !== user.id) {
          console.error(`[index] User ${user.id} attempted to access sitting ${sitting.id} (belongs to ${sitting.scholar_id})`);
          return new Response(
            JSON.stringify({ error: "Unauthorized: sitting does not belong to user" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }

        await processMarkingJob(jobId, supabase);
        processed = 1;
        message = `Job ${jobId} processed`;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : String(err);
        console.error(`[index] processMarkingJob failed:`, errorMsg);
        return new Response(
          JSON.stringify({
            error: `Failed to process job ${jobId}: ${errorMsg}`
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    } else {
      // Batch mode: process all queued jobs (cron dispatch)
      console.log("[index] Batch mode: processing all queued jobs");

      try {
        // Fetch queued jobs (limit to prevent runaway processing)
        const limit = 10; // Max jobs per cron invocation
        const { data: queuedJobs, error: fetchError } = await supabase
          .from("exam_marking_jobs")
          .select("id")
          .eq("status", "queued")
          .lte("scheduled_at", new Date().toISOString())
          .limit(limit)
          .order("scheduled_at", { ascending: true });

        if (fetchError) {
          throw new Error(`Failed to fetch queued jobs: ${fetchError.message}`);
        }

        const jobs = queuedJobs || [];
        console.log(`[index] Processing ${jobs.length} queued jobs`);

        // Process each queued job
        for (const job of jobs) {
          try {
            await processMarkingJob(job.id, supabase);
            processed++;
          } catch (err) {
            const errorMsg =
              err instanceof Error ? err.message : String(err);
            console.warn(`[index] Failed to process job ${job.id}:`, errorMsg);
            // Continue to next job; don't fail entire batch
          }
        }

        // Retry failed jobs (async, non-blocking)
        const retried = await retryFailedJobs(supabase);
        console.log(`[index] Retried ${retried} failed jobs`);

        // Cleanup old jobs (weekly — can run every cron but only deletes old ones)
        const cleaned = await cleanupOldJobs(supabase, 30);
        if (cleaned > 0) {
          console.log(`[index] Cleaned up ${cleaned} old jobs`);
        }

        message = `Processed ${processed} queued jobs, retried ${retried} failed jobs`;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : String(err);
        console.error("[index] Batch processing error:", errorMsg);
        return new Response(
          JSON.stringify({ error: `Batch processing failed: ${errorMsg}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed,
        message
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[index] Unhandled error:", errorMsg);
    return new Response(
      JSON.stringify({ error: `Internal error: ${errorMsg}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
