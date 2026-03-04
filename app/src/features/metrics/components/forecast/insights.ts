import { AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';

interface BuildInsightsInput {
  fiveYearGrowthPct?: number | null;
  projectedGrowthText?: string;
  resourcePlanningText?: string;
  recommendationText?: string;
}

export function buildForecastInsights({
  fiveYearGrowthPct,
  projectedGrowthText,
  resourcePlanningText,
  recommendationText,
}: BuildInsightsInput) {
  const growthValue =
    typeof fiveYearGrowthPct === 'number' ? Math.abs(fiveYearGrowthPct) : 0;
  const stable = growthValue < 2;
  const growthSign =
    typeof fiveYearGrowthPct === 'number' && fiveYearGrowthPct > 0;
  const projectedFallback = stable
    ? 'Enrollment is projected to remain relatively stable over the next five years.'
    : growthSign
      ? `Enrollment is projected to grow by ~${growthValue.toFixed(1)}% over the next five years.`
      : `Enrollment is projected to decline by ~${growthValue.toFixed(1)}% over the next five years.`;

  return [
    {
      icon: TrendingUp,
      title: 'Projected Growth',
      description: projectedGrowthText ?? projectedFallback,
      type: 'positive' as const,
    },
    {
      icon: AlertTriangle,
      title: 'Resource Planning',
      description:
        resourcePlanningText ??
        'Keep resource plans steady with contingency headroom for moderate fluctuations.',
      type: 'warning' as const,
    },
    {
      icon: Lightbulb,
      title: 'Recommendation',
      description:
        recommendationText ??
        'Maintain current student-success initiatives and monitor term-over-term changes.',
      type: 'info' as const,
    },
  ];
}
