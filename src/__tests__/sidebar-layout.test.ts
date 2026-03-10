import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import '@testing-library/jest-dom/vitest'
import { expect, test } from 'vitest'

test('sidebar CSS enables vertical scrolling in constrained windows', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
  expect(css).toContain('.sidebar {')
  expect(css).toContain('overflow-y: auto;')
})
