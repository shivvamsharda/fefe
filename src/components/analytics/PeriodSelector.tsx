
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TimePeriod = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

interface PeriodSelectorProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
}

const periodOptions = [
  { value: '24h' as TimePeriod, label: 'Last 24 hours' },
  { value: '7d' as TimePeriod, label: 'Last 7 days' },
  { value: '30d' as TimePeriod, label: 'Last 30 days' },
  { value: '90d' as TimePeriod, label: 'Last 90 days' },
  { value: '1y' as TimePeriod, label: 'Last year' },
  { value: 'all' as TimePeriod, label: 'All time' },
];

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ value, onChange }) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent>
        {periodOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default PeriodSelector;
