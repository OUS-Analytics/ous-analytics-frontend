'use client';

import { Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

interface SemesterRangeFilterSelectProps {
  startValue: string | undefined;
  endValue: string | undefined;
  onStartValueChange: (value: string | undefined) => void;
  onEndValueChange: (value: string | undefined) => void;
  options: string[];
}

export function SemesterRangeFilterSelect({
  startValue,
  endValue,
  onStartValueChange,
  onEndValueChange,
  options,
}: SemesterRangeFilterSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-2">
        <Select
          value={startValue || 'all'}
          onValueChange={(value) =>
            onStartValueChange(value === 'all' ? undefined : value)
          }
        >
          <SelectTrigger
            className="w-[170px] bg-secondary border-border"
            aria-label="Select migration range start semester"
          >
            <SelectValue placeholder="From semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">From earliest</SelectItem>
            {options.map((option) => (
              <SelectItem key={`start:${option}`} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">to</span>
        <Select
          value={endValue || 'all'}
          onValueChange={(value) =>
            onEndValueChange(value === 'all' ? undefined : value)
          }
        >
          <SelectTrigger
            className="w-[170px] bg-secondary border-border"
            aria-label="Select migration range end semester"
          >
            <SelectValue placeholder="To semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">To latest</SelectItem>
            {options.map((option) => (
              <SelectItem key={`end:${option}`} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
