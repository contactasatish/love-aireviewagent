import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviewId, responseText } = await req.json();

    if (!reviewId || !responseText) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Get review details
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("*, businesses(id)")
      .eq("id", reviewId)
      .single();

    if (reviewError || !review) {
      console.error("Review fetch error:", reviewError);
      return new Response(JSON.stringify({ error: "Review not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // Get OAuth token for this business
    const { data: connection, error: connectionError } = await supabase
      .from("oauth_connections")
      .select("access_token, refresh_token, account_id")
      .eq("business_id", review.businesses.id)
      .eq("provider", "google")
      .eq("status", "active")
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
      .eq("business_id", review.businesses.id)
      .eq("source_id", review.source_id)
      .single();

    if (sourceError || !source || !source.location_id) {
      console.error("Location not found:", sourceError);
      return new Response(JSON.stringify({ error: "Google Business location not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Post reply using Google Business Profile API (current version)
    const locationPath = `accounts/${connection.account_id}/locations/${source.location_id}`;
    const googleResponse = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${locationPath}/reviews/${review.external_review_id}:updateReply`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
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
