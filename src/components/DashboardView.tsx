import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import ReviewFilters from "./ReviewFilters";
import ReviewList from "./ReviewList";
import dashboardBanner from "@/assets/dashboard-banner.jpg";

export interface Review {
  id: string;
  reviewer_name: string;
  review_text: string;
  rating: number;
  source_platform: string;
  source_id: string; // ADD THIS
  status: string;
  sentiment: string | null;
  review_date: string;
  business_id: string;
  businesses: {
    name: string;
  };
}

const DashboardView = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("all");
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBusinesses();
    fetchReviews();
  }, []);

  const fetchBusinesses = async () => {
    const { data, error } = await supabase.from("businesses").select("id, name").order("name");

    if (error) {
      toast.error("Failed to fetch businesses");
      return;
    }
    setBusinesses(data || []);
  };

  const fetchReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reviews")
      .select(
        `
      *,
      businesses (name),
      generated_responses (
        id,
        response_text,
        approval_status,
        ai_model_used,
        created_at
      )
    `,
      )
      .order("review_date", { ascending: false });

    if (error) {
      toast.error("Failed to fetch reviews");
      setLoading(false);
      return;
    }

    setReviews(data || []);
    setLoading(false);
  };

  const filteredReviews = reviews.filter((review) => {
    if (selectedBusiness !== "all" && review.business_id !== selectedBusiness) return false;
    if (selectedSource !== "all" && review.source_id !== selectedSource) return false;
    if (selectedRating !== "all" && review.rating !== parseInt(selectedRating)) return false;
    if (selectedSentiment !== "all" && review.sentiment?.toLowerCase() !== selectedSentiment) return false;
    return true;
  });

  const needsActionCount = filteredReviews.filter((r) => r.status === "pending").length;

  const handleSelectAll = () => {
    if (selectedReviews.size === filteredReviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(filteredReviews.map((r) => r.id)));
    }
  };

  const handleSelectReview = (id: string) => {
    const newSelected = new Set(selectedReviews);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedReviews(newSelected);
  };

  return (
    <div className="space-y-6">
      <div className="w-full h-32 rounded-lg overflow-hidden mb-8">
        <img
          src={dashboardBanner}
          alt="Dashboard analytics and review management"
          className="w-full h-full object-cover"
        />
      </div>
      <ReviewFilters
        businesses={businesses}
        selectedBusiness={selectedBusiness}
        setSelectedBusiness={setSelectedBusiness}
        selectedSource={selectedSource}
        setSelectedSource={setSelectedSource}
        selectedRating={selectedRating}
        setSelectedRating={setSelectedRating}
        selectedSentiment={selectedSentiment}
        setSelectedSentiment={setSelectedSentiment}
      />

      {needsActionCount > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedReviews.size === filteredReviews.length && filteredReviews.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
            />
            <span className="text-sm font-medium text-foreground">
              {needsActionCount} {t("dashboard.itemsNeedAction")}
            </span>
          </div>
        </div>
      )}

      <ReviewList
        reviews={filteredReviews}
        loading={loading}
        selectedReviews={selectedReviews}
        onSelectReview={handleSelectReview}
        onRefresh={fetchReviews}
      />
    </div>
  );
};

export default DashboardView;
