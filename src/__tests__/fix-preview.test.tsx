import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { expect, test, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/tauri'
import ScanPage from '../pages/ScanPage'

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
  convertFileSrc: (p: string) => `tauri-file://${p}`,
}))

const invokeMock = vi.mocked(invoke)

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
  fireEvent.click(screen.getByRole('button', { name: '开始扫描' }))

  expect(await screen.findByText('执行修复说明')).toBeInTheDocument()
  expect(screen.queryByText('确认执行修复')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '执行修复' }))
  expect(screen.getByText('确认执行修复')).toBeInTheDocument()
})
