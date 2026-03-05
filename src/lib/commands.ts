import { invoke } from '@tauri-apps/api/tauri'
import type { ScanIndex, ScanResult } from '../types'

export interface ScanVaultOptions {
  generateThumbs?: boolean
  thumbSize?: number
  prevIndex?: ScanIndex
}

export async function scanVault(root: string, options: ScanVaultOptions = {}): Promise<ScanResult> {
  return invoke<ScanResult>('scan_vault', {
    root,
    generate_thumbs: options.generateThumbs ?? true,
    thumb_size: options.thumbSize ?? 256,
    prev_index: options.prevIndex ?? null,
  })
}
