import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { LangContext } from '../App'
import OperationHistoryPanel from '../components/OperationHistoryPanel'
import { getTranslations } from '../lib/i18n'

vi.mock('../lib/commands', () => ({
  openDiagnosticsDir: vi.fn().mockResolvedValue(undefined),
  openMisplacedFixDiagnostic: vi.fn().mockResolvedValue(undefined),
}))

import { openDiagnosticsDir, openMisplacedFixDiagnostic } from '../lib/commands'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('operation history exposes diagnostic actions for fix tasks', async () => {
  render(
    createElement(
      LangContext.Provider,
      { value: getTranslations('zh') },
      createElement(OperationHistoryPanel, {
        tasks: [{
          taskId: 'task-1',
          taskType: 'fix',
          createdAt: '1700000000',
          policy: 'renameAll',
          status: 'applied',
          entries: [{
            entryId: 'entry-1',
            filePath: 'D:/vault/other/attachments/x.png',
            action: 'move',
            source: 'D:/vault/other/attachments/x.png',
            target: 'D:/vault/notes/attachments/x.png',
            status: 'applied',
            message: '修复后复核通过：文件已位于期望位置 D:/vault/notes/attachments/x.png',
          }],
        }],
      }),
    ),
  )

  fireEvent.click(screen.getByRole('button', { name: '展开' }))
  fireEvent.click(screen.getByRole('button', { name: '打开诊断' }))
  fireEvent.click(screen.getByRole('button', { name: '打开诊断目录' }))

  expect(openMisplacedFixDiagnostic).toHaveBeenCalledWith('task-1')
  expect(openDiagnosticsDir).toHaveBeenCalled()
})
