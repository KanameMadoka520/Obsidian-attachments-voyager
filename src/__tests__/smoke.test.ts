import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { describe, it, expect } from 'vitest'
import App from '../App'

describe('smoke', () => {
  it('has test environment', () => {
    expect(true).toBe(true)
  })

  it('shows author attribution', () => {
    render(createElement(App))
    expect(screen.getByText('GitHub: KanameMadoka520')).toBeInTheDocument()
  })
})
