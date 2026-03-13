import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { createElement, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/tauri'
import GalleryPage from '../pages/GalleryPage'

const invokeMock = vi.mocked(invoke)

function mockThumbnailMap() {
  return {
    '/vault/attachments/a.png': {
      tiny: '/tmp/.voyager-gallery-cache-all/tiny/a.webp',
      small: '/tmp/.voyager-gallery-cache-all/small/a.webp',
      medium: '/tmp/.voyager-gallery-cache-all/medium/a.webp',
    },
  }
}

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

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => createElement('div', { style: { width: 320, height: 240 } }, children),
  }
})

afterEach(() => {
  cleanup()
})

test('gallery uses dedicated all-cache commands for generation and clearing', async () => {
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

  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === 'get_all_thumbnail_paths') return Promise.resolve(mockThumbnailMap())
    return Promise.resolve([])
  })

  render(
    <GalleryPage
      result={{
        totalMd: 1,
        totalImages: 1,
        issues: [],
        scanIndex: { files: {}, mdRefs: {} },
        allImages: [
          { path: '/vault/attachments/a.png', fileName: 'a.png', fileSize: 1024, fileMtime: 1700000000 },
        ],
      }}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: '生成全部缩略图' }))
  await waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith('generate_all_thumbnails_all', { paths: ['/vault/attachments/a.png'] })
  })

  fireEvent.click(screen.getByRole('button', { name: '清除缩略图缓存' }))
  fireEvent.click(await screen.findByRole('button', { name: '确认执行' }))
  await waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith('clear_thumbnail_cache_all')
  })
})

test('gallery thumbnail mode resolves thumbnails from the all-cache namespace', async () => {
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

  render(
    <GalleryPage
      result={{
        totalMd: 1,
        totalImages: 1,
        issues: [],
        scanIndex: { files: {}, mdRefs: {} },
        allImages: [
          { path: '/vault/attachments/a.png', fileName: 'a.png', fileSize: 1024, fileMtime: 1700000000 },
        ],
      }}
    />,
  )

  const thumb = await screen.findByAltText('/vault/attachments/a.png')
  expect(thumb.getAttribute('src')).toContain('.voyager-gallery-cache-all')
})

test('gallery preview provides the same core image actions as scan preview', async () => {
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

  render(
    <GalleryPage
      result={{
        totalMd: 1,
        totalImages: 1,
        issues: [],
        scanIndex: { files: {}, mdRefs: {} },
        allImages: [
          { path: '/vault/attachments/a.png', fileName: 'a.png', fileSize: 1024, fileMtime: 1700000000 },
        ],
      }}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: '原图' }))
  fireEvent.click(await screen.findByAltText('/vault/attachments/a.png'))

  expect(await screen.findByRole('button', { name: '全屏原图' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '重置缩放' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '100% 原始尺寸' })).toBeInTheDocument()
})
