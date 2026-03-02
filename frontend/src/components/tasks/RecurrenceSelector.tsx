import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  until?: string | null;
}

interface RecurrenceSelectorProps {
  value: RecurrenceRule | null;
  onChange: (value: RecurrenceRule | null) => void;
  disabled?: boolean;
}

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function RecurrenceSelector({
  value,
  onChange,
  disabled = false,
}: RecurrenceSelectorProps) {
  const isEnabled = value !== null;

  const frequency = value?.frequency ?? "daily";
  const interval = value?.interval ?? 1;
  const until = value?.until ?? "";

  const intervalLabel = useMemo(() => {
    if (frequency === "daily") return interval === 1 ? "day" : "days";
    if (frequency === "weekly") return interval === 1 ? "week" : "weeks";
    if (frequency === "monthly") return interval === 1 ? "month" : "months";
    if (frequency === "yearly") return interval === 1 ? "year" : "years";
    return "";
  }, [frequency, interval]);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      onChange({ frequency: "daily", interval: 1, until: null });
    } else {
      onChange(null);
    }
  };

  const handleFrequencyChange = (newFrequency: RecurrenceFrequency) => {
    if (!value) return;
    onChange({ ...value, frequency: newFrequency });
  };

  const handleIntervalChange = (newInterval: number) => {
    if (!value) return;
    const clampedInterval = Math.max(1, Math.min(365, newInterval));
    onChange({ ...value, interval: clampedInterval });
  };

  const handleUntilChange = (newUntil: string) => {
    if (!value) return;
    onChange({ ...value, until: newUntil || null });
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(event) => handleToggle(event.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-slate-300 text-blue-600"
        />
        <span className="font-medium">Repeat this task</span>
      </label>

      {isEnabled && value && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/40 p-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900">
              Frequency
            </label>
            <Select
              value={frequency}
              onValueChange={(val) =>
                handleFrequencyChange(val as RecurrenceFrequency)
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900">
              Repeat every
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={365}
                value={interval}
                onChange={(event) =>
                  handleIntervalChange(parseInt(event.target.value, 10) || 1)
                }
                disabled={disabled}
                className="w-20"
              />
              <span className="text-sm text-slate-600">{intervalLabel}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900">
              End date (optional)
            </label>
            <Input
              type="date"
              value={until}
              onChange={(event) => handleUntilChange(event.target.value)}
              disabled={disabled}
            />
            <p className="text-xs text-slate-500">
              Leave blank to repeat indefinitely.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
