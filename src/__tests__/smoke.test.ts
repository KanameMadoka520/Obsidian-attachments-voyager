import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import App from '../App'

vi.mock('@tauri-apps/api/dialog', () => ({
  open: vi.fn(),
}))

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === 'read_all_local_storage') return Promise.resolve({})
    return Promise.resolve([])
  }),
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

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('smoke', () => {
  it('has test environment', () => {
    expect(true).toBe(true)
  })

  it('shows app brand name', async () => {
    render(createElement(App))
    await waitFor(() => {
      expect(screen.getByText('Voyager')).toBeInTheDocument()
    })
  })
})
