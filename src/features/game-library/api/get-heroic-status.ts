import { invoke } from '@/lib/tauri-client'
import { HeroicStatusSchema } from './game-library-schema'

export const getHeroicStatus = async () => {
  const result = await invoke('get_heroic_status')
  return HeroicStatusSchema.parse(result)
}
