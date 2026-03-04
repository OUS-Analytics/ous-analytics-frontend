'use client';

import { useMemo } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Calendar } from '@/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

interface DateFilterButtonProps {
  date: Date | null;
  onDateChange: (date: Date) => void;
  availableDates?: Date[];
  disabled?: boolean;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

export function DateFilterButton({
  date,
  onDateChange,
  availableDates = [],
  disabled = false,
}: DateFilterButtonProps) {
  const availableDateKeys = useMemo(
    () => new Set(availableDates.map((value) => formatDateKey(value))),
    [availableDates]
  );
  const restrictToAvailableDates = availableDateKeys.size > 0;
  const startMonth = new Date(2005, 0);
  const endMonth = new Date(2035, 11);
  const buttonDisabled = disabled;
  const dateLabel = date
    ? date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Select date';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="bg-transparent"
          aria-label="Select data date"
          disabled={buttonDisabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">{dateLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          selected={date ?? undefined}
          disabled={
            restrictToAvailableDates
              ? (nextDate) => !availableDateKeys.has(formatDateKey(nextDate))
              : undefined
          }
          onSelect={(d) => {
            if (d) onDateChange(d);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
