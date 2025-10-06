import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

interface ReviewFiltersProps {
  businesses: Array<{ id: string; name: string }>;
  selectedBusiness: string;
  setSelectedBusiness: (value: string) => void;
  selectedSource: string;
  setSelectedSource: (value: string) => void;
  selectedRating: string;
  setSelectedRating: (value: string) => void;
  selectedSentiment: string;
  setSelectedSentiment: (value: string) => void;
}

const ReviewFilters = ({
  businesses,
  selectedBusiness,
  setSelectedBusiness,
  selectedSource,
  setSelectedSource,
  selectedRating,
  setSelectedRating,
  selectedSentiment,
  setSelectedSentiment,
}: ReviewFiltersProps) => {
  const { t } = useTranslation();
  const sources = ["google", "facebook", "yelp", "app store", "trustpilot"];
  const ratings = ["5", "4", "3", "2", "1"];
  const sentiments = ["positive", "negative", "neutral"];

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      {/* Business Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium min-w-[90px]">{t("dashboard.business")}:</span>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedBusiness === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedBusiness("all")}
          >
            {t("dashboard.all")}
          </Button>
          {businesses.map((business) => (
            <Button
              key={business.id}
              variant={selectedBusiness === business.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedBusiness(business.id)}
            >
              {business.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Source Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium min-w-[90px]">{t("dashboard.source")}:</span>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedSource === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSource("all")}
          >
            {t("dashboard.all")}
          </Button>
          {sources.map((source) => (
            <Button
              key={source}
              variant={selectedSource === source ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSource(source)}
            >
              {source === "app store" ? t("dashboard.appStore") : source.charAt(0).toUpperCase() + source.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Rating Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium min-w-[90px]">{t("dashboard.rating")}:</span>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedRating === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedRating("all")}
          >
            {t("dashboard.all")}
          </Button>
          {ratings.map((rating) => (
            <Button
              key={rating}
              variant={selectedRating === rating ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRating(rating)}
            >
              {rating} ★
            </Button>
          ))}
        </div>
      </div>

      {/* Sentiment Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium min-w-[90px]">{t("dashboard.sentiment")}:</span>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedSentiment === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSentiment("all")}
          >
            {t("dashboard.all")}
          </Button>
          {sentiments.map((sentiment) => (
            <Button
              key={sentiment}
              variant={selectedSentiment === sentiment ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSentiment(sentiment)}
            >
              {t(`dashboard.${sentiment}`)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewFilters;