'use client';

import { memo, useMemo } from 'react';
import { ForecastTrendChartCard } from './forecast/ForecastTrendChartCard';
import { ForecastInsightsGrid } from './forecast/forecast-insights-grid';
import { ForecastNumbersCard } from './forecast/forecast-numbers-card';
import { buildForecastInsights } from './forecast/insights';
import type { ForecastSectionProps } from './forecast/types';

const TERM_INDEX_BY_NAME: Record<string, number> = {
  Spring: 1,
  Summer: 2,
  Fall: 3,
};

function periodSortKey(
  point: ForecastSectionProps['historicalData'][number],
  fallbackIndex: number
): [number, number, number] {
  const numericYear = Number(point.year);
  const numericSemester = Number(point.semester);
  if (Number.isFinite(numericYear) && Number.isFinite(numericSemester)) {
    return [numericYear, numericSemester, fallbackIndex];
  }

  const match = point.period.match(/^(Spring|Summer|Fall)\s+(\d{4})$/i);
  if (!match) {
    return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, fallbackIndex];
  }

  const term = `${match[1].charAt(0).toUpperCase()}${match[1]
    .slice(1)
    .toLowerCase()}` as keyof typeof TERM_INDEX_BY_NAME;
  const year = Number.parseInt(match[2], 10);
  const semester = TERM_INDEX_BY_NAME[term];
  return [year, semester, fallbackIndex];
}

function sortForecastPoints<
  T extends ForecastSectionProps['historicalData'][number],
>(points: T[]): T[] {
  return points
    .map((point, index) => ({ point, index }))
    .sort((left, right) => {
      const leftKey = periodSortKey(left.point, left.index);
      const rightKey = periodSortKey(right.point, right.index);
      const yearDifference = leftKey[0] - rightKey[0];
      if (yearDifference !== 0) {
        return yearDifference;
      }

      const semesterDifference = leftKey[1] - rightKey[1];
      if (semesterDifference !== 0) {
        return semesterDifference;
      }

      return leftKey[2] - rightKey[2];
    })
    .map((entry) => entry.point);
}

function ForecastSectionComponent({
  historicalData,
  forecastData,
  fiveYearGrowthPct,
  insights: insightTexts,
}: ForecastSectionProps) {
  const sortedHistoricalData = useMemo(
    () => sortForecastPoints(historicalData),
    [historicalData]
  );
  const sortedForecastData = useMemo(
    () => sortForecastPoints(forecastData),
    [forecastData]
  );

  const combinedData = useMemo(
    () => [
      ...sortedHistoricalData.map((point) => ({
        ...point,
        isForecasted: false,
      })),
      ...sortedForecastData.map((point) => ({ ...point, isForecasted: true })),
    ],
    [sortedHistoricalData, sortedForecastData]
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
        historicalCount={sortedHistoricalData.length}
        lastHistoricalPeriod={
          sortedHistoricalData[sortedHistoricalData.length - 1]?.period
        }
      />
      <ForecastInsightsGrid insights={insights} />
      <ForecastNumbersCard forecastData={sortedForecastData} />
    </div>
  );
}

export const ForecastSection = memo(ForecastSectionComponent);
