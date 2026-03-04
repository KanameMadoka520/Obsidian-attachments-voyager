import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { beforeEach, expect, test, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/tauri'
import ScanPage from '../pages/ScanPage'

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
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

const invokeMock = vi.mocked(invoke)

beforeEach(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 600 } })
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 800 } })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return 600 } })
  Element.prototype.getBoundingClientRect = () => ({
    top: 0, left: 0, bottom: 600, right: 800, width: 800, height: 600, x: 0, y: 0, toJSON: () => {},
  })
})

test('requires confirmation before execute', async () => {
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === 'scan_vault') {
      return Promise.resolve({
        totalMd: 1,
        totalImages: 1,
        issues: [{ id: '1', type: 'orphan', imagePath: '/x.png', reason: 'unused', thumbnailPath: '/t/x.png' }],
      })
    }
    return Promise.resolve([])
  })

  render(<ScanPage conflictPolicy="renameAll" />)

  fireEvent.change(screen.getByLabelText('仓库路径'), { target: { value: 'D:/vault' } })
  fireEvent.click(screen.getByRole('button', { name: '扫描' }))

  expect(await screen.findByAltText('/x.png')).toBeInTheDocument()
  expect(screen.queryByText('确认执行修复')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /修复/ }))
  expect(screen.getByText('确认执行修复')).toBeInTheDocument()
})
