import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'

vi.mock('@tauri-apps/api/dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
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

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === 'read_all_local_storage') return Promise.resolve({})
    if (cmd === 'scan_vault') {
      return Promise.resolve({
        totalMd: 2,
        totalImages: 2,
        issues: [
          { id: '1', type: 'orphan', imagePath: '/vault/attachments/a.png', reason: 'unused', thumbnailPath: '/thumb/a.webp' },
        ],
        scanIndex: { files: {}, mdRefs: {} },
        allImages: [
          { path: '/vault/attachments/a.png', fileName: 'a.png', fileSize: 1200, fileMtime: 1700000000 },
          { path: '/vault/attachments/b.png', fileName: 'b.png', fileSize: 2400, fileMtime: 1700000100 },
        ],
      })
    }
    if (cmd === 'get_runtime_logs' || cmd === 'list_operation_history') return Promise.resolve([])
    if (cmd === 'read_all_local_storage') return Promise.resolve({})
    return Promise.resolve([])
  }),
  convertFileSrc: (p: string) => `tauri-file://${p}`,
}))

describe('app gallery persistence', () => {
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

    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 600 } })
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 800 } })
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get() { return 2000 } })
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return 600 } })
    Element.prototype.getBoundingClientRect = () => ({
      top: 0, left: 0, bottom: 600, right: 800, width: 800, height: 600, x: 0, y: 0, toJSON: () => {},
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('keeps gallery data after revisiting scan page from another tab', async () => {
    render(<App />)

    fireEvent.change(await screen.findByLabelText('仓库路径'), {
      target: { value: 'D:/vault' },
    })
    fireEvent.click(screen.getByRole('button', { name: '扫描' }))

    await screen.findByAltText('/vault/attachments/a.png')

    fireEvent.click(screen.getByRole('button', { name: '说明' }))
    await screen.findByText('软件能做什么')

    fireEvent.click(screen.getByRole('button', { name: '附件问题扫描' }))
    await screen.findByText('这是主工作台：先选择仓库并开始扫描，再按类型筛选结果，最后查看详情并执行修复、备份、去重、转格式或导出。')

    fireEvent.click(screen.getByRole('button', { name: '附件总览' }))

    await waitFor(() => {
      expect(screen.queryByText('请先在「附件扫描」页面执行扫描')).not.toBeInTheDocument()
    })
    expect(screen.getByText('这里展示仓库中的全部附件，不仅是问题图片。适合用来统一浏览、筛选和抽查附件资产。')).toBeInTheDocument()
  })
})
