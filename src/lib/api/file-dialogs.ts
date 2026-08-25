import { invoke } from '@/lib/tauri-client'

export const selectExecutable = () => invoke<string | null>('select_executable')
export const selectImage = () => invoke<string | null>('select_image')
