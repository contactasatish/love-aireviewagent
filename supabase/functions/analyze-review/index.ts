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
    const { reviewId, reviewText, rating } = await req.json();

    if (!reviewId || !reviewText) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Analyze sentiment using Lovable AI
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
            content: "You are a sentiment analysis expert. Analyze the review and respond with ONLY ONE WORD: 'positive', 'negative', or 'neutral'. No explanations, just the sentiment.",
          },
          {
            role: "user",
            content: `Analyze this ${rating}-star review: "${reviewText}"`,
          },
        ],
      }),
    });

    if (!sentimentResponse.ok) {
      const errorText = await sentimentResponse.text();
      console.error("Sentiment analysis error:", sentimentResponse.status, errorText);
      
      if (sentimentResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (sentimentResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("Sentiment analysis failed");
    }

    const sentimentData = await sentimentResponse.json();
    const sentiment = sentimentData.choices[0]?.message?.content?.trim().toLowerCase() || "neutral";
    console.log("Detected sentiment:", sentiment);

    // Generate response using Lovable AI
    console.log("Generating response for review:", reviewId);
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
            content: "You are a professional customer service representative. Generate a thoughtful, empathetic response to this review. Keep it concise (2-3 sentences), professional, and appropriate for the sentiment.",
          },
          {
            role: "user",
            content: `Generate a response to this ${rating}-star review with ${sentiment} sentiment: "${reviewText}"`,
          },
        ],
      }),
    });

    if (!responseGeneration.ok) {
      const errorText = await responseGeneration.text();
      console.error("Response generation error:", responseGeneration.status, errorText);
      throw new Error("Response generation failed");
    }

    const responseData = await responseGeneration.json();
    const generatedResponse = responseData.choices[0]?.message?.content || "";
    console.log("Generated response:", generatedResponse);

    // Update review with sentiment
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: updateError } = await supabase
      .from("reviews")
      .update({ sentiment, status: "responded" })
      .eq("id", reviewId);

    if (updateError) {
      console.error("Error updating review:", updateError);
      throw updateError;
    }

    // Save generated response
    const { error: responseError } = await supabase
      .from("generated_responses")
      .insert({
        review_id: reviewId,
        response_text: generatedResponse,
        approval_status: "pending",
        ai_model_used: "google/gemini-2.5-flash",
      });

    if (responseError) {
      console.error("Error saving response:", responseError);
      throw responseError;
    }

    console.log("Analysis complete for review:", reviewId);
    return new Response(
      JSON.stringify({ sentiment, response: generatedResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-review function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});