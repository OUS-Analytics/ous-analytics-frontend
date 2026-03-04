'use client';

import { memo, useMemo } from 'react';
import { ForecastTrendChartCard } from './forecast/ForecastTrendChartCard';
import { ForecastInsightsGrid } from './forecast/forecast-insights-grid';
import { ForecastNumbersCard } from './forecast/forecast-numbers-card';
import { buildForecastInsights } from './forecast/insights';
import type { ForecastSectionProps } from './forecast/types';

function ForecastSectionComponent({
  historicalData,
  forecastData,
  fiveYearGrowthPct,
  insights: insightTexts,
}: ForecastSectionProps) {
  const combinedData = useMemo(
    () => [
      ...historicalData.map((point) => ({ ...point, isForecasted: false })),
      ...forecastData.map((point) => ({ ...point, isForecasted: true })),
    ],
    [historicalData, forecastData]
  );

  const insights = useMemo(
    () =>
      buildForecastInsights({
        fiveYearGrowthPct,
        projectedGrowthText: insightTexts?.projectedGrowthText,
        resourcePlanningText: insightTexts?.resourcePlanningText,
        recommendationText: insightTexts?.recommendationText,
      }),
    [
      fiveYearGrowthPct,
      insightTexts?.projectedGrowthText,
      insightTexts?.recommendationText,
      insightTexts?.resourcePlanningText,
    ]
  );

  return (
    <div className="space-y-6">
      <ForecastTrendChartCard
        combinedData={combinedData}
        historicalCount={historicalData.length}
        lastHistoricalPeriod={historicalData[historicalData.length - 1]?.period}
      />
      <ForecastInsightsGrid insights={insights} />
      <ForecastNumbersCard forecastData={forecastData} />
    </div>
  );
}

export const ForecastSection = memo(ForecastSectionComponent);
