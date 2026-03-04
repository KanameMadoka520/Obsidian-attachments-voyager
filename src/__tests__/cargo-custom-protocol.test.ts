import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

describe('tauri custom protocol feature wiring', () => {
  it('maps custom-protocol to tauri/custom-protocol in Cargo.toml', () => {
    const cargoTomlPath = resolve(process.cwd(), 'src-tauri', 'Cargo.toml')
    const cargoToml = readFileSync(cargoTomlPath, 'utf8')

    expect(cargoToml).toContain('custom-protocol = [ "tauri/custom-protocol" ]')
  })
})
