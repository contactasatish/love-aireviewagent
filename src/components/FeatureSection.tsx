import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface FeatureSectionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  image?: string;
}

const FeatureSection = ({ icon: Icon, title, description, image }: FeatureSectionProps) => {
  return (
    <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden">
      {image && (
        <div className="w-full h-48 overflow-hidden">
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader className="space-y-4">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <CardTitle className="text-xl font-bold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base text-muted-foreground leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
};

export default FeatureSection;
