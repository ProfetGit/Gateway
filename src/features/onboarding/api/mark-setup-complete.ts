import { invoke } from '@/lib/tauri-client'

export const markSetupComplete = () => invoke<void>('mark_setup_complete')
