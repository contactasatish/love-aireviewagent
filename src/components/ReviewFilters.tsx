import { Button } from "./ui/button";

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
  const sources = ["Google", "Facebook", "Yelp", "App Store", "Trustpilot"];
  const ratings = ["5", "4", "3", "2", "1"];
  const sentiments = ["Positive", "Negative", "Neutral"];

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Business:</span>
          <Button
            variant={selectedBusiness === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedBusiness("all")}
          >
            All
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

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Source:</span>
          <Button
            variant={selectedSource === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSource("all")}
          >
            All
          </Button>
          {sources.map((source) => (
            <Button
              key={source}
              variant={selectedSource === source.toLowerCase() ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSource(source.toLowerCase())}
            >
              {source}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Rating:</span>
          <Button
            variant={selectedRating === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedRating("all")}
          >
            All
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

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sentiment:</span>
          <Button
            variant={selectedSentiment === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSentiment("all")}
          >
            All
          </Button>
          {sentiments.map((sentiment) => (
            <Button
              key={sentiment}
              variant={selectedSentiment === sentiment.toLowerCase() ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSentiment(sentiment.toLowerCase())}
            >
              {sentiment}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewFilters;