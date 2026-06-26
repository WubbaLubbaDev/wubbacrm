import { cn } from '@/lib/cn';
import type { GoogleCalendar } from '@/lib/google-calendar';

export interface CalendarSelectorProps {
  calendars: GoogleCalendar[];
  selectedId: string | null;
  onChange: (calendarId: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function CalendarSelector({
  calendars,
  selectedId,
  onChange,
  disabled,
  className,
  id,
}: CalendarSelectorProps) {
  return (
    <select
      id={id}
      value={selectedId ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow]',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      <option value="">Select a calendar...</option>
      {calendars.map((cal) => (
        <option key={cal.id} value={cal.id}>
          {cal.summary}
          {cal.primary ? ' (Primary)' : ''}
        </option>
      ))}
    </select>
  );
}
