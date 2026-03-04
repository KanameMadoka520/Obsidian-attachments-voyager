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
})

test('choosing directory fills vault path input', async () => {
  openMock.mockResolvedValue('D:/vault')
  invokeMock.mockResolvedValue([])

  render(<ScanPage conflictPolicy="renameAll" />)

  fireEvent.click(screen.getByRole('button', { name: '选择目录' }))

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
  fireEvent.click(screen.getByRole('button', { name: '开始扫描' }))

  await waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith('scan_vault', {
      root: 'D:/vault',
      generate_thumbs: true,
      thumb_size: 256,
    })
  })

  expect(screen.getByText('Markdown 文件数')).toBeInTheDocument()
  expect(screen.getByText('图片总数')).toBeInTheDocument()

  const img = await screen.findByAltText('/a.png')
  expect(img).toHaveAttribute('src', 'tauri-file:///t/a.png')

  fireEvent.click(screen.getByRole('button', { name: '清除缩略图缓存' }))
  expect(invokeMock).toHaveBeenCalledWith('clear_thumbnail_cache')
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
  fireEvent.click(screen.getByRole('button', { name: '开始扫描' }))

  await screen.findByText('全选')

  fireEvent.click(screen.getByRole('button', { name: '执行修复' }))
  fireEvent.click(screen.getByRole('button', { name: '确认执行' }))

  await screen.findByText('请先选择要修复的文件')

  fireEvent.click(screen.getByRole('button', { name: '全选' }))
  fireEvent.click(screen.getByRole('button', { name: '执行修复' }))
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
