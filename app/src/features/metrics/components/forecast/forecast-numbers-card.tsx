import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import type { ForecastData } from './types';

interface ForecastNumbersCardProps {
  forecastData: ForecastData[];
}

export function ForecastNumbersCard({
  forecastData,
}: ForecastNumbersCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-foreground">
          Forecasted Numbers
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {`Showing ${forecastData.length} terms`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {forecastData.map((forecast) => (
            <div
              key={forecast.period}
              className="rounded-lg bg-secondary/50 p-4 text-center"
            >
              <p className="text-xs text-muted-foreground">{forecast.period}</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {forecast.total.toLocaleString()}
              </p>
              <p className="text-xs text-chart-2">Projected</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
