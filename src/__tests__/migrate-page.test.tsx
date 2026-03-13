import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/tauri'
import MigratePage from '../pages/MigratePage'

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
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
  invokeMock.mockReset()
})

afterEach(() => {
  cleanup()
})

test('preview plan requires both note path and target directory', () => {
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === 'get_runtime_logs' || cmd === 'list_operation_history') {
      return Promise.resolve([])
    }
    return Promise.resolve(null)
  })

  render(<MigratePage conflictPolicy="renameAll" />)

  fireEvent.click(screen.getByRole('button', { name: '预览迁移计划' }))

  expect(screen.getByText('请先填写笔记路径和目标目录')).toBeInTheDocument()
})

test('preview generates migration item and execute calls backend', async () => {
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === 'get_runtime_logs' || cmd === 'list_operation_history') {
      return Promise.resolve([])
    }
    if (cmd === 'execute_migration') {
      return Promise.resolve({ taskId: 't1', movedNotes: 1, movedAssets: 2 })
    }
    return Promise.resolve(null)
  })

  render(<MigratePage conflictPolicy="renameAll" />)

  fireEvent.change(screen.getByLabelText('选择笔记'), {
    target: { value: 'D:/vault/notes/a.md' },
  })
  fireEvent.change(screen.getByLabelText('目标目录'), {
    target: { value: 'D:/vault/attachments' },
  })

  fireEvent.click(screen.getByRole('button', { name: '预览迁移计划' }))

  expect(screen.getByText('D:/vault/notes/a.md -> D:/vault/attachments')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '执行迁移' }))

  expect(await screen.findByText(/迁移完成：task=t1/)).toBeInTheDocument()
})

test('migration preview is invalidated after changing inputs', async () => {
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === 'get_runtime_logs' || cmd === 'list_operation_history') {
      return Promise.resolve([])
    }
    if (cmd === 'execute_migration') {
      return Promise.resolve({ taskId: 'should-not-run', movedNotes: 1, movedAssets: 1 })
    }
    return Promise.resolve(null)
  })

  render(<MigratePage conflictPolicy="renameAll" />)

  fireEvent.change(screen.getByLabelText('选择笔记'), {
    target: { value: 'D:/vault/notes/a.md' },
  })
  fireEvent.change(screen.getByLabelText('目标目录'), {
    target: { value: 'D:/vault/notes' },
  })
  fireEvent.click(screen.getByRole('button', { name: '预览迁移计划' }))

  expect(screen.getByText('D:/vault/notes/a.md -> D:/vault/notes')).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('目标目录'), {
    target: { value: 'D:/vault/archive' },
  })
  fireEvent.click(screen.getByRole('button', { name: '执行迁移' }))

  expect(await screen.findByText('请先生成迁移预览再执行')).toBeInTheDocument()
  const executeCalls = invokeMock.mock.calls.filter(([cmd]) => cmd === 'execute_migration')
  expect(executeCalls).toHaveLength(0)
})

test('flatten preview requires selecting a root folder', async () => {
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === 'get_runtime_logs' || cmd === 'list_operation_history') {
      return Promise.resolve([])
    }
    return Promise.resolve(null)
  })

  render(<MigratePage conflictPolicy="renameAll" />)

  fireEvent.click(screen.getByRole('button', { name: '预览汇总计划' }))

  expect(await screen.findByText('请先选择要整理的目录')).toBeInTheDocument()
})

test('flatten preview lists merge operations and execute calls backend', async () => {
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === 'get_runtime_logs' || cmd === 'list_operation_history') {
      return Promise.resolve([])
    }
    if (cmd === 'preview_flatten_attachments') {
      return Promise.resolve({
        destinationDir: 'D:/vault/topic/attachments',
        sourceFolders: [
          'D:/vault/topic/a/attachments',
          'D:/vault/topic/b/attachments',
        ],
        items: [
          {
            sourcePath: 'D:/vault/topic/a/attachments/a.png',
            targetPath: 'D:/vault/topic/attachments/a.png',
          },
          {
            sourcePath: 'D:/vault/topic/b/attachments/b.png',
            targetPath: 'D:/vault/topic/attachments/b.png',
          },
        ],
      })
    }
    if (cmd === 'flatten_attachments') {
      return Promise.resolve({
        taskId: 'flat-1',
        destinationDir: 'D:/vault/topic/attachments',
        movedFiles: 2,
        removedFolders: 2,
        skippedFiles: 0,
      })
    }
    return Promise.resolve(null)
  })

  render(<MigratePage conflictPolicy="renameAll" />)

  fireEvent.change(screen.getByLabelText('整理目录'), {
    target: { value: 'D:/vault/topic' },
  })

  fireEvent.click(screen.getByRole('button', { name: '预览汇总计划' }))

  expect(await screen.findByDisplayValue('D:/vault/topic/attachments')).toBeInTheDocument()
  expect(invokeMock).toHaveBeenCalledWith('preview_flatten_attachments', {
    rootDir: 'D:/vault/topic',
    policy: 'renameAll',
  })
  expect(screen.getByText('[MOVE] D:/vault/topic/a/attachments/a.png -> D:/vault/topic/attachments/a.png')).toBeInTheDocument()
  expect(screen.getByText('[REMOVE EMPTY DIR] D:/vault/topic/a/attachments')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '执行汇总' }))

  expect(await screen.findByText(/预处理完成：task=flat-1/)).toBeInTheDocument()
})

test('flatten preview is invalidated after changing root folder', async () => {
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === 'get_runtime_logs' || cmd === 'list_operation_history') {
      return Promise.resolve([])
    }
    if (cmd === 'preview_flatten_attachments') {
      return Promise.resolve({
        destinationDir: 'D:/vault/topic/attachments',
        sourceFolders: ['D:/vault/topic/a/attachments'],
        items: [
          {
            sourcePath: 'D:/vault/topic/a/attachments/a.png',
            targetPath: 'D:/vault/topic/attachments/a.png',
          },
        ],
      })
    }
    if (cmd === 'flatten_attachments') {
      return Promise.resolve({
        taskId: 'should-not-run',
        destinationDir: 'D:/vault/other/attachments',
        movedFiles: 1,
        removedFolders: 1,
        skippedFiles: 0,
      })
    }
    return Promise.resolve(null)
  })

  render(<MigratePage conflictPolicy="renameAll" />)

  fireEvent.change(screen.getByLabelText('整理目录'), {
    target: { value: 'D:/vault/topic' },
  })
  fireEvent.click(screen.getByRole('button', { name: '预览汇总计划' }))

  expect(await screen.findByText('[MOVE] D:/vault/topic/a/attachments/a.png -> D:/vault/topic/attachments/a.png')).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('整理目录'), {
    target: { value: 'D:/vault/other' },
  })
  fireEvent.click(screen.getByRole('button', { name: '执行汇总' }))

  expect(await screen.findByText('请先生成预处理预览再执行')).toBeInTheDocument()
  const flattenCalls = invokeMock.mock.calls.filter(([cmd]) => cmd === 'flatten_attachments')
  expect(flattenCalls).toHaveLength(0)
})
