import { invoke } from '@tauri-apps/api/tauri'

let cache: Map<string, string | null> = new Map()
let initialized = false

/**
 * Load all stored data from exe-local voyager-data/ folder.
 * Must be called once before getItem/setItem.
 */
export async function initStorage(): Promise<void> {
  if (initialized) return
  const all = await invoke<Record<string, string>>('read_all_local_storage')
  cache = new Map(Object.entries(all))
  initialized = true
}

export function getItem(key: string): string | null {
  return cache.get(key) ?? null
}

export function setItem(key: string, value: string): void {
  cache.set(key, value)
  invoke('write_local_storage', { key, value }).catch(() => {})
}

export function removeItem(key: string): void {
  cache.delete(key)
  invoke('remove_local_storage', { key }).catch(() => {})
}
