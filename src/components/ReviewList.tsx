import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Sparkles, Check, Edit, X, RefreshCw } from "lucide-react";
import { Review } from "./DashboardView";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ReviewListProps {
  reviews: Review[];
  loading: boolean;
  selectedReviews: Set<string>;
  onSelectReview: (id: string) => void;
  onRefresh: () => void;
}

const ReviewList = ({ reviews, loading, selectedReviews, onSelectReview, onRefresh }: ReviewListProps) => {
  const { t } = useTranslation();
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>("");
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      google: "bg-red-500",
      facebook: "bg-blue-500",
      yelp: "bg-orange-500",
      trustpilot: "bg-green-500",
      "app store": "bg-purple-500",
    };
    return colors[source.toLowerCase()] || "bg-gray-500";
  };

  const handleAnalyze = async (review: Review) => {
    setAnalyzingIds(new Set(analyzingIds).add(review.id));

    try {
      const { data, error } = await supabase.functions.invoke("analyze-review", {
        body: {
          reviewId: review.id,
          reviewText: review.review_text,
          rating: review.rating,
          reviewerName: review.reviewer_name, // Pass reviewer name
        },
      });

      if (error) throw error;

      toast.success(t("dashboard.analyzeSuccess"));
      onRefresh();
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || t("dashboard.analyzeFailed"));
    } finally {
      const newSet = new Set(analyzingIds);
      newSet.delete(review.id);
      setAnalyzingIds(newSet);
    }
  };

  const handleApproveAndPost = async (review: Review, responseId: string, responseText: string) => {
    setApprovingIds(new Set(approvingIds).add(responseId));

    try {
      // First, update the approval status
      const { error: approvalError } = await supabase
        .from("generated_responses")
        .update({ approval_status: "approved" })
        .eq("id", responseId);

      if (approvalError) throw approvalError;

      // Then, post to Google (if Google Business)
      if (review.source_platform.toLowerCase() === "google business") {
        const { data, error: postError } = await supabase.functions.invoke("post-review-response", {
          body: {
            reviewId: review.id,
            responseText: responseText,
          },
        });

        if (postError) {
          console.error("Failed to post to Google:", postError);
          toast.error("Response approved but failed to post to Google. You can post it manually.");
        } else {
          toast.success("Response approved and posted to Google!");
        }
      } else {
        toast.success("Response approved! (Manual posting required for this platform)");
      }

      onRefresh();
    } catch (error: any) {
      console.error("Approve error:", error);
      toast.error("Failed to approve response");
    } finally {
      const newSet = new Set(approvingIds);
      newSet.delete(responseId);
      setApprovingIds(newSet);
    }
  };

  const handleStartEdit = (responseId: string, currentText: string) => {
    setEditingResponseId(responseId);
    setEditedText(currentText);
  };

  const handleSaveEdit = async (responseId: string) => {
    if (!editedText.trim()) {
      toast.error("Response cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("generated_responses")
        .update({
          response_text: editedText,
          approval_status: "pending", // Reset to pending after edit
        })
        .eq("id", responseId);

      if (error) throw error;

      toast.success("Response updated successfully!");
      setEditingResponseId(null);
      setEditedText("");
      onRefresh();
    } catch (error: any) {
      console.error("Edit error:", error);
      toast.error("Failed to update response");
    }
  };

  const handleCancelEdit = () => {
    setEditingResponseId(null);
    setEditedText("");
  };

  const handleReject = async (responseId: string) => {
    try {
      const { error } = await supabase
        .from("generated_responses")
        .update({ approval_status: "rejected" })
        .eq("id", responseId);

      if (error) throw error;

      toast.success("Response rejected. Click 'Regenerate' to create a new one.");
      onRefresh();
    } catch (error: any) {
      console.error("Reject error:", error);
      toast.error("Failed to reject response");
    }
  };

  const handleRegenerate = async (review: Review, responseId: string) => {
    try {
      // Delete the old rejected response
      const { error: deleteError } = await supabase.from("generated_responses").delete().eq("id", responseId);

      if (deleteError) throw deleteError;

      // Trigger new analysis
      await handleAnalyze(review);
    } catch (error: any) {
      console.error("Regenerate error:", error);
      toast.error("Failed to regenerate response");
    }
  };

  if (loading) {
    return <div className="text-center py-8">{t("dashboard.loading")}</div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">{t("dashboard.noReviewsFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="bg-card border border-border rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start gap-4">
            <input
              type="checkbox"
              checked={selectedReviews.has(review.id)}
              onChange={() => onSelectReview(review.id)}
              className="mt-1.5 w-4 h-4 rounded border-border accent-primary cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge className={`${getSourceColor(review.source_platform)} text-white font-medium px-2.5 py-0.5`}>
                  {review.source_platform}
                </Badge>
                <span className="font-bold text-foreground">{review.reviewer_name}</span>
                <Badge variant="secondary" className="bg-muted text-foreground font-medium">
                  {review.businesses.name}
                </Badge>
                <div className="flex text-yellow-400">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <span key={i} className="text-lg">
                      ★
                    </span>
                  ))}
                  {Array.from({ length: 5 - review.rating }).map((_, i) => (
                    <span key={i} className="text-lg text-gray-600">
                      ★
                    </span>
                  ))}
                </div>
                <span className="ml-auto text-sm text-muted-foreground">
                  {new Date(review.review_date).toLocaleDateString()}
                </span>
              </div>

              <p className="text-sm text-foreground mb-3 leading-relaxed">{review.review_text}</p>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                {review.status === "pending" && (
                  <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 font-medium">
                    {t("dashboard.needsAction")}
                  </Badge>
                )}
                {review.sentiment && (
                  <Badge
                    variant="outline"
                    className={
                      review.sentiment === "positive"
                        ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400 font-medium"
                        : review.sentiment === "negative"
                          ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-medium"
                          : "border-gray-500 bg-gray-500/10 text-gray-600 dark:text-gray-400 font-medium"
                    }
                  >
                    {review.sentiment.charAt(0).toUpperCase() + review.sentiment.slice(1)}
                  </Badge>
                )}
              </div>

              {/* AI Generated Response Section */}
              {review.generated_responses && review.generated_responses.length > 0 && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm text-primary">AI-Generated Response</span>
                    <Badge
                      variant="outline"
                      className={
                        review.generated_responses[0].approval_status === "approved"
                          ? "border-green-500 bg-green-500/10 text-green-600"
                          : review.generated_responses[0].approval_status === "rejected"
                            ? "border-red-500 bg-red-500/10 text-red-600"
                            : "border-yellow-500 bg-yellow-500/10 text-yellow-600"
                      }
                    >
                      {review.generated_responses[0].approval_status}
                    </Badge>
                  </div>

                  {editingResponseId === review.generated_responses[0].id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="w-full p-3 text-sm border border-border rounded-lg bg-background text-foreground min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Edit the response..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(review.generated_responses![0].id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-foreground leading-relaxed mb-3">
                        {review.generated_responses[0].response_text}
                      </p>

                      {review.generated_responses[0].approval_status === "rejected" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRegenerate(review, review.generated_responses![0].id)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Regenerate
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleApproveAndPost(
                                review,
                                review.generated_responses![0].id,
                                review.generated_responses![0].response_text,
                              )
                            }
                            disabled={
                              review.generated_responses[0].approval_status === "approved" ||
                              approvingIds.has(review.generated_responses![0].id)
                            }
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {approvingIds.has(review.generated_responses![0].id) ? "Posting..." : "Approve & Post"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleStartEdit(
                                review.generated_responses![0].id,
                                review.generated_responses![0].response_text,
                              )
                            }
                            disabled={review.generated_responses[0].approval_status === "approved"}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReject(review.generated_responses![0].id)}
                            disabled={review.generated_responses[0].approval_status === "approved"}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <Button
              size="lg"
              onClick={() => handleAnalyze(review)}
              disabled={
                analyzingIds.has(review.id) || (review.generated_responses && review.generated_responses.length > 0)
              }
              className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {analyzingIds.has(review.id) ? t("dashboard.analyzing") : t("dashboard.analyze")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReviewList;
