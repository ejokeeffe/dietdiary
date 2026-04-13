import { describe, it, expect } from 'vitest'
import { addDays, formatDisplay, toLocalDateStr } from '../DateNav'

describe('toLocalDateStr', () => {
  it('formats a Date using local year/month/day parts', () => {
    // Construct a date using local parts to verify it round-trips correctly
    const d = new Date(2026, 3, 3) // months are 0-indexed: April = 3
    expect(toLocalDateStr(d)).toBe('2026-04-03')
  })

  it('zero-pads month and day', () => {
    expect(toLocalDateStr(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('addDays', () => {
  it('adds one day', () => {
    expect(addDays('2026-04-02', 1)).toBe('2026-04-03')
  })

  it('subtracts one day', () => {
    expect(addDays('2026-04-03', -1)).toBe('2026-04-02')
  })

  it('handles month boundary', () => {
    expect(addDays('2026-03-31', 1)).toBe('2026-04-01')
  })

  it('handles year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('does not UTC-shift — parses input as local time not UTC midnight', () => {
    // If the date string were parsed as UTC (no T00:00:00 suffix), a timezone
    // behind UTC would roll the date back by one day before adding. This test
    // verifies the result is always the arithmetically correct local date.
    expect(addDays('2026-01-01', 0)).toBe('2026-01-01')
    expect(addDays('2026-04-02', 1)).toBe('2026-04-03')
    expect(addDays('2026-04-03', -1)).toBe('2026-04-02')
  })
})

describe('formatDisplay', () => {
  it('returns "Today" for the current local date', () => {
    const today = toLocalDateStr(new Date())
    expect(formatDisplay(today)).toBe('Today')
  })

  it('returns "Yesterday" for yesterday\'s local date', () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const yesterday = toLocalDateStr(d)
    expect(formatDisplay(yesterday)).toBe('Yesterday')
  })

  it('returns a formatted string for older dates', () => {
    // Any date more than 1 day ago should return a locale string, not Today/Yesterday
    const result = formatDisplay('2026-01-01')
    expect(result).not.toBe('Today')
    expect(result).not.toBe('Yesterday')
    expect(result.length).toBeGreaterThan(0)
  })
})
