import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DateNav, { addDays, formatDisplay } from './DateNav'

// ---------------------------------------------------------------------------
// addDays — pure function tests (no mocking needed)
// ---------------------------------------------------------------------------
describe('addDays', () => {
  it('adds one day', () => {
    expect(addDays('2026-04-02', 1)).toBe('2026-04-03')
  })

  it('subtracts one day', () => {
    expect(addDays('2026-04-02', -1)).toBe('2026-04-01')
  })

  it('crosses a month boundary forward', () => {
    expect(addDays('2026-04-30', 1)).toBe('2026-05-01')
  })

  it('crosses a month boundary backward', () => {
    expect(addDays('2026-05-01', -1)).toBe('2026-04-30')
  })

  it('crosses a year boundary forward', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('crosses a year boundary backward', () => {
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('handles leap day forward', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('handles leap day backward', () => {
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
  })
})

// ---------------------------------------------------------------------------
// formatDisplay — uses mocked Date so "today" is deterministic
// ---------------------------------------------------------------------------
describe('formatDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Today" for today\'s date', () => {
    expect(formatDisplay('2026-04-02')).toBe('Today')
  })

  it('returns "Yesterday" for yesterday\'s date', () => {
    expect(formatDisplay('2026-04-01')).toBe('Yesterday')
  })

  it('returns a formatted date string for other dates', () => {
    const result = formatDisplay('2026-03-25')
    expect(result).not.toBe('Today')
    expect(result).not.toBe('Yesterday')
    expect(result).toMatch(/Wed/)
  })
})

// ---------------------------------------------------------------------------
// DateNav component — forward/backward button behaviour
// ---------------------------------------------------------------------------
describe('DateNav component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('forward button is disabled when viewing today', () => {
    render(<DateNav date="2026-04-02" onChange={() => {}} />)
    expect(screen.getByLabelText('Next day')).toBeDisabled()
  })

  it('forward button is enabled when viewing a past date', () => {
    render(<DateNav date="2026-04-01" onChange={() => {}} />)
    expect(screen.getByLabelText('Next day')).not.toBeDisabled()
  })

  it('backward button is always enabled', () => {
    render(<DateNav date="2026-04-02" onChange={() => {}} />)
    expect(screen.getByLabelText('Previous day')).not.toBeDisabled()
  })

  it('clicking forward calls onChange with the next day', () => {
    const onChange = vi.fn()
    render(<DateNav date="2026-04-01" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Next day'))
    expect(onChange).toHaveBeenCalledWith('2026-04-02')
  })

  it('clicking backward calls onChange with the previous day', () => {
    const onChange = vi.fn()
    render(<DateNav date="2026-04-02" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Previous day'))
    expect(onChange).toHaveBeenCalledWith('2026-04-01')
  })

  it('clicking forward from a past date does not navigate past today', () => {
    const onChange = vi.fn()
    render(<DateNav date="2026-04-01" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Next day'))
    expect(onChange).toHaveBeenCalledWith('2026-04-02')
  })

  it('forward button advances correctly across a month boundary', () => {
    const onChange = vi.fn()
    vi.setSystemTime(new Date('2026-05-05T12:00:00'))
    render(<DateNav date="2026-04-30" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Next day'))
    expect(onChange).toHaveBeenCalledWith('2026-05-01')
  })

  it('displays "Today" label when on today', () => {
    render(<DateNav date="2026-04-02" onChange={() => {}} />)
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('displays "Yesterday" label when on yesterday', () => {
    render(<DateNav date="2026-04-01" onChange={() => {}} />)
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
  })
})
