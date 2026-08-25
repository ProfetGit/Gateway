import { invoke } from '@/lib/tauri-client'
import { SetupStateSchema } from '@/features/onboarding/api/onboarding-schema'

export const getSetupState = async () => {
  const result = await invoke('get_setup_state')
  return SetupStateSchema.parse(result)
}
