import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { openRequest, renderApp } from '../../../test/render-app'

describe('TabBar', () => {
  it('switches with the keyboard and closes tabs', async () => {
    const { user } = await renderApp()
    await openRequest(user, /List users/)
    await openRequest(user, /Countries/)
    const first = screen.getByRole('tab', { name: /List users/ })
    first.focus()
    await user.keyboard('{Enter}')
    expect(first).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('button', { name: 'Close List users' }))
    expect(screen.getByRole('tab', { name: /Countries/ })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('button', { name: 'Close Countries' }))
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })
})
