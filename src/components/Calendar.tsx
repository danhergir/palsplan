import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, formatMonth, isPast, monthDays, toDateKey, WEEKDAYS } from '../lib/dates'

type CalendarProps = {
  month: Date
  selected: Set<string>
  filteredDates?: Set<string>
  counts: Map<string, number>
  memberCount: number
  contextLabel?: string
  onMonthChange: (date: Date) => void
  onToggle: (key: string) => void
}

function Month({
  month,
  selected,
  filteredDates,
  counts,
  memberCount,
  onToggle,
}: Omit<CalendarProps, 'month' | 'onMonthChange'> & { month: Date }) {
  return (
    <section className="calendar-month" aria-label={formatMonth(month)}>
      <h3>{formatMonth(month)}</h3>
      <div className="weekday-row" aria-hidden="true">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="date-grid">
        {monthDays(month).map((date, index) => {
          if (!date) return <span className="date-cell date-cell--empty" key={`empty-${index}`} />
          const key = toDateKey(date)
          const chosen = selected.has(key)
          const filtered = filteredDates?.has(key) ?? false
          const count = counts.get(key) ?? 0
          const disabled = isPast(date)
          const strongMatch = memberCount > 1 && count === memberCount
          return (
            <button
              className={`date-cell ${chosen ? 'is-selected' : ''} ${strongMatch ? 'is-match' : ''} ${filtered ? 'is-filtered' : ''}`}
              type="button"
              key={key}
              disabled={disabled}
              aria-pressed={chosen}
              aria-label={`${date.toLocaleDateString('en', { month: 'long', day: 'numeric' })}${chosen ? ', selected' : ''}${count ? `, ${count} available` : ''}`}
              onClick={() => onToggle(key)}
            >
              <span>{date.getDate()}</span>
              {count > 0 && <i aria-hidden="true" style={{ '--match': count / memberCount } as React.CSSProperties} />}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function Calendar({ month, onMonthChange, contextLabel, ...props }: CalendarProps) {
  return (
    <div className="calendar-shell">
      <div className="calendar-nav">
        <button className="icon-button" type="button" onClick={() => onMonthChange(addMonths(month, -1))} aria-label="Previous month">
          <ChevronLeft size={20} />
        </button>
        <span>{contextLabel ?? 'Choose every day that could work'}</span>
        <button className="icon-button" type="button" onClick={() => onMonthChange(addMonths(month, 1))} aria-label="Next month">
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="calendar-pair">
        <Month month={month} {...props} />
        <Month month={addMonths(month, 1)} {...props} />
      </div>
    </div>
  )
}
