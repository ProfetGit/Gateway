import { invoke } from '@/lib/tauri-client'

export const cancelWindowsInstaller = () => invoke<boolean>('cancel_windows_installer')
