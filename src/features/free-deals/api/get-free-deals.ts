import { invoke } from '@/lib/tauri-client'
import { FetchFreeDealsResultSchema } from './free-deals-schema'

export const getFreeDeals = async () => {
  const result = await invoke('get_free_deals')
  return FetchFreeDealsResultSchema.parse(result)
}
