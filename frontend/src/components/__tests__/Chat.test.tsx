import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Chat from '../Chat'

const mockSendChat = vi.fn()

vi.mock('../../api/client', () => ({
  api: {
    sendChat: (...args: unknown[]) => mockSendChat(...args),
  },
}))

beforeEach(() => {
  mockSendChat.mockReset()
  mockSendChat.mockResolvedValue({
    type: 'entry',
    confirmation: 'Logged: Earl Grey tea — 5 kcal at 09:46',
    entry: null,
    answer: null,
    error: null,
  })
})

describe('Chat date handling', () => {
  it('sends the currentDate prop as the date in the API call', async () => {
    render(<Chat currentDate="2026-04-03" profileId={1} onEntryLogged={() => {}} />)

    const input = screen.getByPlaceholderText(/What did you eat/)
    await userEvent.type(input, 'Earl Grey tea')
    await userEvent.click(screen.getByRole('button', { name: '→' }))

    expect(mockSendChat).toHaveBeenCalledWith('Earl Grey tea', '2026-04-03', 1)
  })

  it('does not use todays date if currentDate prop is a past date', async () => {
    // When the user is viewing a past date, chat should log to that past date
    render(<Chat currentDate="2026-04-01" profileId={1} onEntryLogged={() => {}} />)

    const input = screen.getByPlaceholderText(/What did you eat/)
    await userEvent.type(input, 'Porridge')
    await userEvent.click(screen.getByRole('button', { name: '→' }))

    expect(mockSendChat).toHaveBeenCalledWith('Porridge', '2026-04-01', 1)
    expect(mockSendChat).not.toHaveBeenCalledWith('Porridge', expect.not.stringContaining('2026-04-01'), 1)
  })
})
