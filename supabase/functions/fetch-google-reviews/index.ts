import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get request body
    const { businessId, sourceId } = await req.json();

    if (!businessId || !sourceId) {
      return new Response(
        JSON.stringify({ error: "Missing businessId or sourceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the OAuth connection
    const { data: connection, error: connectionError } = await supabase
      .from("source_connections")
      .select("oauth_token, oauth_refresh_token, token_expires_at")
      .eq("business_id", businessId)
      .eq("source_id", sourceId)
      .eq("status", "connected")
      .single();

    if (connectionError || !connection) {
      console.error("Connection error:", connectionError);
      return new Response(
        JSON.stringify({ error: "No connected source found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = connection.oauth_token;

    // Check if token is expired and refresh if needed
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      console.log("Token expired, refreshing...");
      
      const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
      const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        throw new Error("Missing Google OAuth credentials");
      }

      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: connection.oauth_refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh token");
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update the new token in database
      const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
      await supabase
        .from("source_connections")
        .update({
          oauth_token: accessToken,
          token_expires_at: expiresAt,
        })
        .eq("business_id", businessId)
        .eq("source_id", sourceId);
    }

    // Step 1: Get list of accounts (locations)
    const accountsResponse = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error("Accounts API error:", errorText);
      throw new Error(`Failed to fetch accounts: ${accountsResponse.status}`);
    }

    const accountsData = await accountsResponse.json();
    console.log("Accounts data:", JSON.stringify(accountsData));

    if (!accountsData.accounts || accountsData.accounts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No Google Business accounts found", reviewsCount: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the first account (or you can modify to handle multiple accounts)
    const accountName = accountsData.accounts[0].name;

    // Step 2: Get locations for this account
    const locationsResponse = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!locationsResponse.ok) {
      const errorText = await locationsResponse.text();
      console.error("Locations API error:", errorText);
      throw new Error(`Failed to fetch locations: ${locationsResponse.status}`);
    }

    const locationsData = await locationsResponse.json();
    console.log("Locations data:", JSON.stringify(locationsData));

    if (!locationsData.locations || locationsData.locations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No locations found for this account", reviewsCount: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalReviewsInserted = 0;

    // Step 3: Fetch reviews for each location
    for (const location of locationsData.locations) {
      const locationName = location.name;
      console.log("Fetching reviews for location:", locationName);

      const reviewsResponse = await fetch(
        `https://mybusiness.googleapis.com/v4/${locationName}/reviews`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!reviewsResponse.ok) {
        console.error(`Failed to fetch reviews for ${locationName}:`, reviewsResponse.status);
        continue; // Skip this location and try the next one
      }

      const reviewsData = await reviewsResponse.json();
      console.log(`Reviews for ${locationName}:`, JSON.stringify(reviewsData));

      if (!reviewsData.reviews || reviewsData.reviews.length === 0) {
        console.log(`No reviews found for ${locationName}`);
        continue;
      }

      // Step 4: Insert reviews into database
      for (const review of reviewsData.reviews) {
        const reviewRecord = {
          business_id: businessId,
          source_id: sourceId,
          source_platform: "Google Business",
          external_review_id: review.reviewId || review.name,
          reviewer_name: review.reviewer?.displayName || "Anonymous",
          rating: review.starRating === "FIVE" ? 5 :
                  review.starRating === "FOUR" ? 4 :
                  review.starRating === "THREE" ? 3 :
                  review.starRating === "TWO" ? 2 :
                  review.starRating === "ONE" ? 1 : 3,
          review_text: review.comment || "",
          review_date: review.createTime || new Date().toISOString(),
          status: "pending",
          sentiment: null, // Will be set by analyze function
        };

        // Insert or update review (upsert based on external_review_id)
        const { error: insertError } = await supabase
          .from("reviews")
          .upsert(reviewRecord, {
            onConflict: "business_id,source_id,external_review_id",
            ignoreDuplicates: false,
          });

        if (insertError) {
          console.error("Error inserting review:", insertError);
        } else {
          totalReviewsInserted++;
        }
      }
    }

    console.log(`Successfully inserted ${totalReviewsInserted} reviews`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully fetched ${totalReviewsInserted} reviews`,
        reviewsCount: totalReviewsInserted,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in fetch-google-reviews:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch reviews" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
