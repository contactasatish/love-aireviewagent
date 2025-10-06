import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReviewFilters from "./ReviewFilters";
import ReviewList from "./ReviewList";

export interface Review {
  id: string;
  reviewer_name: string;
  review_text: string;
  rating: number;
  source_platform: string;
  status: string;
  sentiment: string | null;
  review_date: string;
  business_id: string;
  businesses: {
    name: string;
  };
}

const DashboardView = () => {
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
    const { data, error } = await supabase
      .from("businesses")
      .select("id, name")
      .order("name");
    
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
      .select(`
        *,
        businesses (name)
      `)
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
    if (selectedSource !== "all" && review.source_platform.toLowerCase() !== selectedSource.toLowerCase()) return false;
    if (selectedRating !== "all" && review.rating !== parseInt(selectedRating)) return false;
    if (selectedSentiment !== "all" && review.sentiment !== selectedSentiment) return false;
    return true;
  });

  const needsActionCount = filteredReviews.filter(r => r.status === "pending").length;

  const handleSelectAll = () => {
    if (selectedReviews.size === filteredReviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(filteredReviews.map(r => r.id)));
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
        <div className="bg-muted border border-border rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedReviews.size === filteredReviews.length && filteredReviews.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">
              {needsActionCount} items need action. Select items or "Select All".
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