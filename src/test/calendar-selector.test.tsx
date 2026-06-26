import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CalendarSelector } from '@/components/integrations/calendar-selector';
import type { GoogleCalendar } from '@/lib/google-calendar';

describe('CalendarSelector', () => {
  const mockCalendars: GoogleCalendar[] = [
    { id: 'cal1', summary: 'Work Calendar', primary: true },
    { id: 'cal2', summary: 'Personal Calendar' },
  ];

  it('renders a placeholder option', () => {
    render(<CalendarSelector calendars={[]} selectedId={null} onChange={() => {}} />);
    expect(screen.getByText('Select a calendar...')).toBeDefined();
  });

  it('renders all calendars', () => {
    render(<CalendarSelector calendars={mockCalendars} selectedId={null} onChange={() => {}} />);
    expect(screen.getByText('Work Calendar (Primary)')).toBeDefined();
    expect(screen.getByText('Personal Calendar')).toBeDefined();
  });

  it('marks the selected calendar as selected', () => {
    render(<CalendarSelector calendars={mockCalendars} selectedId="cal2" onChange={() => {}} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('cal2');
  });

  it('shows empty value when no calendar is selected', () => {
    render(<CalendarSelector calendars={mockCalendars} selectedId={null} onChange={() => {}} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('');
  });
});
