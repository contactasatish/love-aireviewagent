import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const analyzeReviewSchema = z.object({
  reviewId: z.string().uuid("Invalid review ID format"),
  reviewText: z.string().min(1, "Review text cannot be empty").max(5000, "Review text too long"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  reviewerName: z.string().max(100, "Reviewer name too long").optional(),
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
    const validation = analyzeReviewSchema.safeParse(body);
    
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

    const { reviewId, reviewText, rating, reviewerName } = validation.data;

    // Verify review ownership
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("user_id")
      .eq("id", reviewId)
      .single();

    if (reviewError || !review || review.user_id !== user.id) {
      console.error("Review ownership check failed:", reviewError);
      return new Response(
        JSON.stringify({ error: "Review not found or access denied" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Analyze sentiment
    console.log("Analyzing review:", reviewId);
    const sentimentResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a sentiment analysis expert. Analyze the review and respond with ONLY ONE WORD: 'positive', 'negative', or 'neutral'. No explanations, just the sentiment.",
          },
          {
            role: "user",
            content: `Analyze this ${rating}-star review: "${reviewText}"`,
          },
        ],
      }),
    });

    if (!sentimentResponse.ok) {
      console.error("Sentiment analysis error - Status:", sentimentResponse.status);

      if (sentimentResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (sentimentResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Failed to analyze sentiment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sentimentData = await sentimentResponse.json();
    const sentiment = sentimentData.choices[0]?.message?.content?.trim().toLowerCase() || "neutral";
    console.log("Detected sentiment:", sentiment);

    // Generate response with actual reviewer name
    console.log("Generating response for review:", reviewId);
    const customerGreeting = reviewerName ? `Dear ${reviewerName}` : "Thank you for your feedback";

    const responseGeneration = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a professional customer service representative. Generate a thoughtful, empathetic response to this review. 
            
CRITICAL RULES:
1. Start with "${customerGreeting}" if the reviewer's name is provided
2. Keep it concise (2-3 sentences)
3. Be professional and appropriate for the sentiment
4. Use the EXACT reviewer name provided - never use placeholders like [Customer Name]
5. Make the response feel personal and genuine`,
          },
          {
            role: "user",
            content: `Generate a response to this ${rating}-star review from ${reviewerName || "a customer"} with ${sentiment} sentiment: "${reviewText}"`,
          },
        ],
      }),
    });

    if (!responseGeneration.ok) {
      console.error("Response generation error - Status:", responseGeneration.status);
      return new Response(JSON.stringify({ error: "Failed to generate response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseData = await responseGeneration.json();
    const generatedResponse = responseData.choices[0]?.message?.content || "";
    console.log("Generated response:", generatedResponse);

    // Update review with sentiment
    const { error: updateError } = await supabase
      .from("reviews")
      .update({ sentiment, status: "responded" })
      .eq("id", reviewId);

    if (updateError) {
      console.error("Error updating review:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update review" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save generated response
    const { error: responseError } = await supabase.from("generated_responses").insert({
      review_id: reviewId,
      response_text: generatedResponse,
      approval_status: "pending",
      ai_model_used: "google/gemini-2.5-flash",
    });

    if (responseError) {
      console.error("Error saving response:", responseError);
      return new Response(JSON.stringify({ error: "Failed to save response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Analysis complete for review:", reviewId);
    return new Response(JSON.stringify({ sentiment, response: generatedResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-review function:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
