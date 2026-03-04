import { describe, it, expect } from 'vitest'
import type { AuditIssue } from '../types'

describe('types contract', () => {
  it('supports orphan and misplaced issue types', () => {
    const t: AuditIssue['type'][] = ['orphan', 'misplaced']
    expect(t).toEqual(['orphan', 'misplaced'])
  })

  it('supports optional thumbnailPath for gallery rendering', () => {
    const issue: AuditIssue = {
      id: '1',
      type: 'orphan',
      imagePath: '/a.png',
      reason: 'unused',
      thumbnailPath: '/thumb.png',
    }
    expect(issue.thumbnailPath).toBe('/thumb.png')
  })
})
