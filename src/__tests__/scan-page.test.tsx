import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { open } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'
import ScanPage from '../pages/ScanPage'

vi.mock('@tauri-apps/api/dialog', () => ({
  open: vi.fn(),
}))

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
  convertFileSrc: (p: string) => `tauri-file://${p}`,
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
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

const openMock = vi.mocked(open)
const invokeMock = vi.mocked(invoke)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  openMock.mockReset()
  invokeMock.mockReset()
  vi.spyOn(window, 'confirm').mockReturnValue(true)

  // Mock ResizeObserver and element dimensions for VirtualGallery
  global.ResizeObserver = class {
    private callback: ResizeObserverCallback
    constructor(cb: ResizeObserverCallback) { this.callback = cb }
    observe() {
      this.callback([{ contentRect: { width: 800 } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver)
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver

  // jsdom has 0 for all layout properties; virtualizer needs real dimensions
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 600 } })
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 800 } })
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get() { return 2000 } })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return 600 } })
  Element.prototype.getBoundingClientRect = () => ({
    top: 0, left: 0, bottom: 600, right: 800, width: 800, height: 600, x: 0, y: 0, toJSON: () => {},
  })
})

test('choosing directory fills vault path input', async () => {
  openMock.mockResolvedValue('D:/vault')
  invokeMock.mockResolvedValue([])

  render(<ScanPage conflictPolicy="renameAll" />)

  fireEvent.click(screen.getByRole('button', { name: '选择' }))

  await waitFor(() => {
    expect(screen.getByLabelText('仓库路径')).toHaveValue('D:/vault')
  })
})

test('scan button invokes backend and renders result stats', async () => {
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === 'scan_vault') {
      return Promise.resolve({
        totalMd: 5,
        totalImages: 9,
        issues: [
          { id: '1', type: 'orphan', imagePath: '/a.png', reason: 'unused', thumbnailPath: '/t/a.png' },
          { id: '2', type: 'misplaced', imagePath: '/b.png', reason: 'wrong dir', thumbnailPath: '/t/b.png' },
        ],
      })
    }
    if (cmd === 'get_runtime_logs' || cmd === 'list_operation_history') {
      return Promise.resolve([])
    }
    if (cmd === 'clear_thumbnail_cache') {
      return Promise.resolve({ removed: 2, cacheDir: '/.voyager-gallery-cache' })
    }
    return Promise.resolve({ moved: 1, deleted: 0, skipped: 0 })
  })

  render(<ScanPage conflictPolicy="renameAll" />)

  fireEvent.change(screen.getByLabelText('仓库路径'), {
    target: { value: 'D:/vault' },
  })
  fireEvent.click(screen.getByRole('button', { name: '扫描' }))

  await waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith('scan_vault', {
      root: 'D:/vault',
      generate_thumbs: true,
      thumb_size: 256,
    })
  })

  const img = await screen.findByAltText('/a.png')
  expect(img).toHaveAttribute('src', 'tauri-file:///t/a.png')
})

test('fix requires selecting issues and supports select all', async () => {
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === 'scan_vault') {
      return Promise.resolve({
        totalMd: 1,
        totalImages: 2,
        issues: [
          { id: '1', type: 'orphan', imagePath: '/a.png', reason: 'unused', thumbnailPath: '/t/a.png' },
          { id: '2', type: 'misplaced', imagePath: '/b.png', reason: 'wrong dir', suggestedTarget: '/t/b.png', thumbnailPath: '/t/b.png' },
        ],
      })
    }
    if (cmd === 'get_runtime_logs' || cmd === 'list_operation_history') {
      return Promise.resolve([])
    }
    if (cmd === 'fix_issues') {
      return Promise.resolve({ moved: 1, deleted: 1, skipped: 0 })
    }
    return Promise.resolve([])
  })

  render(<ScanPage conflictPolicy="renameAll" />)

  fireEvent.change(screen.getByLabelText('仓库路径'), { target: { value: 'D:/vault' } })
  fireEvent.click(screen.getByRole('button', { name: '扫描' }))

  await screen.findByText('全选')

  fireEvent.click(screen.getByRole('button', { name: /^修复/ }))
  fireEvent.click(screen.getByRole('button', { name: '确认执行' }))

  await screen.findByText('请先选择要修复的文件')

  fireEvent.click(screen.getByRole('button', { name: '全选' }))
  fireEvent.click(screen.getByRole('button', { name: /^修复/ }))
  fireEvent.click(screen.getByRole('button', { name: '确认执行' }))

  await waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith(
      'fix_issues',
      expect.objectContaining({
        policy: 'renameAll',
      })
    )
  })
})
