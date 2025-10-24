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
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get review details with external_review_id
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select(`
        *,
        sources!inner(business_id),
        businesses!inner(id)
      `)
      .eq("id", reviewId)
      .single();

    if (reviewError || !review) {
      return new Response(
        JSON.stringify({ error: "Review not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get OAuth token for this business
    const { data: connection, error: connectionError } = await supabase
      .from("oauth_connections")
      .select("access_token, account_id")
      .eq("business_id", review.businesses.id)
      .eq("provider", "google")
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error: "Google account not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Post reply to Google My Business API
    const googleResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${connection.account_id}/locations/${review.external_location_id}/reviews/${review.external_review_id}/reply`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comment: responseText,
        }),
      }
    );

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error("Google API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to post response to Google" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully posted response to Google for review:", reviewId);
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in post-review-response function:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
