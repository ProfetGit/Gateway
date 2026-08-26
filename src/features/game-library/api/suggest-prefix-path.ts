import { invoke } from '@/lib/tauri-client'

export const suggestPrefixPath = (title: string) =>
  invoke<string>('suggest_prefix_path', { title })
