import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const fetchReviewsSchema = z.object({
  businessId: z.string().uuid("Invalid business ID format"),
  sourceId: z.string().uuid("Invalid source ID format"),
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
    const validation = fetchReviewsSchema.safeParse(body);
    
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

    const { businessId, sourceId } = validation.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify business ownership
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("user_id")
      .eq("id", businessId)
      .single();

    if (bizError || !business || business.user_id !== user.id) {
      console.error("Business ownership check failed:", bizError);
      return new Response(
        JSON.stringify({ error: "Business not found or access denied" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get OAuth connection for this business (FIXED: changed from oauth_connections to source_connections)
    const { data: connection, error: connectionError } = await supabase
      .from("source_connections")
      .select("oauth_token, oauth_refresh_token, metadata")
      .eq("business_id", businessId)
      .eq("source_id", sourceId)
      .eq("status", "connected")
      .single();

    if (connectionError || !connection) {
      console.error("OAuth connection error:", connectionError);
      return new Response(JSON.stringify({ error: "Google account not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get enabled source to find location_id
    const { data: enabledSource, error: sourceError } = await supabase
      .from("enabled_sources")
      .select("location_id")
      .eq("business_id", businessId)
      .eq("source_id", sourceId)
      .single();

    if (sourceError || !enabledSource || !enabledSource.location_id) {
      console.error("Location not found:", sourceError);
      return new Response(JSON.stringify({ error: "Google Business location not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch reviews from Google My Business API
    const accountId = connection.metadata?.account_id;
    if (!accountId) {
      console.error("Account ID not found in metadata");
      return new Response(JSON.stringify({ error: "Google account configuration incomplete" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const locationPath = `accounts/${accountId}/locations/${enabledSource.location_id}`;
    const reviewsResponse = await fetch(`https://mybusiness.googleapis.com/v4/${locationPath}/reviews`, {
      headers: {
        Authorization: `Bearer ${connection.oauth_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!reviewsResponse.ok) {
      const errorText = await reviewsResponse.text();
      console.error("Google API error:", reviewsResponse.status, errorText);

      if (reviewsResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Failed to fetch reviews from Google" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reviewsData = await reviewsResponse.json();
    const reviews = reviewsData.reviews || [];

    console.log(`Fetched ${reviews.length} reviews from Google`);

    // Insert reviews into database
    let insertedCount = 0;
    for (const review of reviews) {
      // Extract review ID from the review name
      // Format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
      const reviewId = review.name ? review.name.split("/").pop() : review.reviewId;

      // Check if review already exists
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("external_review_id", reviewId)
        .eq("business_id", businessId)
        .single();

      if (existingReview) {
        console.log(`Review ${reviewId} already exists, skipping`);
        continue;
      }

      // Map star rating
      const ratingMap: Record<string, number> = {
        ONE: 1,
        TWO: 2,
        THREE: 3,
        FOUR: 4,
        FIVE: 5,
      };

      const rating = ratingMap[review.starRating] || 3;

      // Insert new review
      const { error: insertError } = await supabase.from("reviews").insert({
        business_id: businessId,
        source_id: sourceId,
        user_id: user.id,
        source_platform: "Google Business",
        external_review_id: reviewId,
        reviewer_name: review.reviewer?.displayName || "Anonymous",
        rating: rating,
        review_text: review.comment || "",
        review_date: review.createTime || new Date().toISOString(),
        status: "pending",
      });

      if (insertError) {
        console.error("Error inserting review:", insertError);
        continue;
      }

      insertedCount++;
    }

    console.log(`Successfully inserted ${insertedCount} new reviews`);

    return new Response(
      JSON.stringify({
        success: true,
        totalFetched: reviews.length,
        newReviews: insertedCount,
        reviewsCount: insertedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in fetch-google-reviews function:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
