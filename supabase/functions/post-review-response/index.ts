import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const postResponseSchema = z.object({
  reviewId: z.string().uuid("Invalid review ID format"),
  responseText: z.string().min(1, "Response text cannot be empty").max(4096, "Response text too long"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate input
    const body = await req.json();
    const validation = postResponseSchema.safeParse(body);
    
    if (!validation.success) {
      console.error("Validation failed:", validation.error.issues);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: validation.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { reviewId, responseText } = validation.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get review details and verify ownership
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("*, business_id, source_id, user_id")
      .eq("id", reviewId)
      .single();

    if (reviewError || !review) {
      console.error("Review fetch error:", reviewError);
      return new Response(JSON.stringify({ error: "Review not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify review ownership
    if (review.user_id !== user.id) {
      console.error("Review ownership check failed");
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if this review has Google metadata (external_review_id)
    if (!review.external_review_id) {
      console.log("Review does not have external_review_id - cannot post to Google");
      return new Response(
        JSON.stringify({
          error: "This review was not fetched from Google and cannot be posted back",
          isTestReview: true,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get OAuth token for this business (FIXED: changed from oauth_connections to source_connections)
    const { data: connection, error: connectionError } = await supabase
      .from("source_connections")
      .select("oauth_token, oauth_refresh_token, metadata")
      .eq("business_id", review.business_id)
      .eq("source_id", review.source_id)
      .eq("status", "connected")
      .single();

    if (connectionError || !connection) {
      console.error("OAuth connection error:", connectionError);
      return new Response(JSON.stringify({ error: "Google account not connected or token expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get location from enabled_sources
    const { data: source, error: sourceError } = await supabase
      .from("enabled_sources")
      .select("location_id")
      .eq("business_id", review.business_id)
      .eq("source_id", review.source_id)
      .single();

    if (sourceError || !source || !source.location_id) {
      console.error("Location not found:", sourceError);
      return new Response(JSON.stringify({ error: "Google Business location not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountId = connection.metadata?.account_id;
    if (!accountId) {
      console.error("Account ID not found in metadata");
      return new Response(JSON.stringify({ error: "Google account configuration incomplete" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Post reply using Google Business Profile API (current version)
    const locationPath = `accounts/${accountId}/locations/${source.location_id}`;
    const googleResponse = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${locationPath}/reviews/${review.external_review_id}:updateReply`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${connection.oauth_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comment: responseText,
        }),
      },
    );

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error("Google API error:", googleResponse.status, errorText);

      // If token expired, try to refresh
      if (googleResponse.status === 401) {
        return new Response(JSON.stringify({ error: "Google token expired. Please reconnect your account." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          error: "Failed to post response to Google",
          details: errorText,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Successfully posted response to Google for review:", reviewId);

    // Update the review status
    await supabase.from("reviews").update({ status: "posted" }).eq("id", reviewId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in post-review-response function:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
