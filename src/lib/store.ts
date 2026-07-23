import { localStore } from './localStore'
import { isSupabaseConfigured, supabaseStore } from './supabaseStore'

export const store = isSupabaseConfigured ? supabaseStore : localStore
export const dataMode = isSupabaseConfigured ? 'live' : 'demo'
