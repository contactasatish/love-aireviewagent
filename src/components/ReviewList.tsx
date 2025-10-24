import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Sparkles, Check, Edit, X } from "lucide-react";
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

  const handleApprove = async (responseId: string) => {
    try {
      const { error } = await supabase
        .from("generated_responses")
        .update({ approval_status: "approved" })
        .eq("id", responseId);

      if (error) throw error;

      toast.success("Response approved successfully!");
      onRefresh();
    } catch (error: any) {
      console.error("Approve error:", error);
      toast.error("Failed to approve response");
    }
  };

  const handleStartEdit = (responseId: string, currentText: string) => {
    setEditingResponseId(responseId);
    setEditedText(currentText);
  };

  const handleSaveEdit = async (responseId: string) => {
    try {
      const { error } = await supabase
        .from("generated_responses")
        .update({ response_text: editedText })
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

      toast.success("Response rejected");
      onRefresh();
    } catch (error: any) {
      console.error("Reject error:", error);
      toast.error("Failed to reject response");
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
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(review.generated_responses![0].id)}
                          disabled={review.generated_responses[0].approval_status === "approved"}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve & Post
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
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReject(review.generated_responses![0].id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
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
