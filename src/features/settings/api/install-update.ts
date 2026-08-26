import { invoke } from '@/lib/tauri-client'

export const installUpdate = () => invoke<void>('install_update')
