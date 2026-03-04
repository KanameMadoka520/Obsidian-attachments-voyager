import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import App from '../App'

vi.mock('@tauri-apps/api/dialog', () => ({
  open: vi.fn(),
}))

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn().mockResolvedValue([]),
  convertFileSrc: (p: string) => `tauri-file://${p}`,
}))

vi.mock('@tauri-apps/api/window', () => ({
  appWindow: {
    isMaximized: () => Promise.resolve(false),
    isFullscreen: () => Promise.resolve(false),
    setFullscreen: () => Promise.resolve(),
    minimize: () => Promise.resolve(),
    toggleMaximize: () => Promise.resolve(),
    close: () => Promise.resolve(),
    onResized: () => Promise.resolve(() => {}),
  },
}))

beforeEach(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

describe('smoke', () => {
  it('has test environment', () => {
    expect(true).toBe(true)
  })

  it('shows app brand name', () => {
    render(createElement(App))
    expect(screen.getByText('Voyager')).toBeInTheDocument()
  })
})
