'use client';

import { Calendar, GraduationCap, Users } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import type { MajorsFilterValues } from '@/features/filters/hooks/useMajorsFiltersParam';

export type { MajorsFilterValues };

interface MajorsFilterPanelProps {
  filters: MajorsFilterValues;
  onFiltersChange: (filters: MajorsFilterValues) => void;
  academicPeriodOptions: string[];
  schoolOptions: string[];
  studentTypeOptions: string[];
}

function normalizeSelectValue(value: string): string | undefined {
  return value === 'all' ? undefined : value;
}

function toSelectValue(value: string | undefined): string {
  return value ?? 'all';
}

export function MajorsFilterPanel({
  filters,
  onFiltersChange,
  academicPeriodOptions,
  schoolOptions,
  studentTypeOptions,
}: MajorsFilterPanelProps) {
  return (
    <div className="flex flex-col gap-4" data-testid="majors-filter-panel">
      <h3 className="text-sm font-medium text-foreground">Filters</h3>

      <div className="space-y-1">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          Semester
        </label>
        <Select
          value={toSelectValue(filters.academicPeriod)}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              academicPeriod: normalizeSelectValue(v),
            })
          }
        >
          <SelectTrigger
            className="w-full bg-secondary border-border"
            aria-label="Select semester"
          >
            <SelectValue placeholder="All Semesters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            {academicPeriodOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5" />
          School
        </label>
        <Select
          value={toSelectValue(filters.school)}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              school: normalizeSelectValue(v),
            })
          }
        >
          <SelectTrigger
            className="w-full bg-secondary border-border"
            aria-label="Select school"
          >
            <SelectValue placeholder="All Schools" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schools</SelectItem>
            {schoolOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Student Type
        </label>
        <Select
          value={toSelectValue(filters.studentType)}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              studentType: normalizeSelectValue(v),
            })
          }
        >
          <SelectTrigger
            className="w-full bg-secondary border-border"
            aria-label="Select student type"
          >
            <SelectValue placeholder="All Student Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Student Types</SelectItem>
            {studentTypeOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
