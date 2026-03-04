import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import type { ForecastData } from './types';
import { ForecastTrendChartPlot } from './ForecastTrendChartPlot';
import { ForecastChartLegend } from './forecast-chart-legend';

interface ForecastTrendChartCardProps {
  combinedData: ForecastData[];
  historicalCount: number;
  lastHistoricalPeriod?: string;
}

export function ForecastTrendChartCard({
  combinedData,
  historicalCount,
  lastHistoricalPeriod,
}: ForecastTrendChartCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-foreground">
          Student Forecast
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Projected student counts for upcoming semesters
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ForecastTrendChartPlot
            combinedData={combinedData}
            historicalCount={historicalCount}
            lastHistoricalPeriod={lastHistoricalPeriod}
          />
        </div>
        <ForecastChartLegend />
      </CardContent>
    </Card>
  );
}
