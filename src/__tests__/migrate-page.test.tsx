import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, expect, test, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/tauri'
import MigratePage from '../pages/MigratePage'

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}))

const invokeMock = vi.mocked(invoke)

afterEach(() => {
  cleanup()
})

test('preview plan requires both note path and target directory', () => {
  render(<MigratePage conflictPolicy="renameAll" />)

  fireEvent.click(screen.getByRole('button', { name: '预览迁移计划' }))

  expect(screen.getByText('请先填写笔记路径和目标目录')).toBeInTheDocument()
})

test('preview generates migration item and execute calls backend', async () => {
  invokeMock.mockResolvedValue({ taskId: 't1', movedNotes: 1, movedAssets: 2 })

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
