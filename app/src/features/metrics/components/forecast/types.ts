export interface ForecastData {
  period: string;
  year?: number;
  semester?: number;
  total: number;
  isForecasted?: boolean;
}

export interface ForecastInsightTexts {
  projectedGrowthText?: string;
  resourcePlanningText?: string;
  recommendationText?: string;
}

export interface ForecastSectionProps {
  historicalData: ForecastData[];
  forecastData: ForecastData[];
  fiveYearGrowthPct?: number | null;
  insights?: ForecastInsightTexts;
}
