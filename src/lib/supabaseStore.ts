import { createClient } from '@supabase/supabase-js'
import type { Availability, CreateTripInput, Member, Trip, TripNote, TripSnapshot, TripStore } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const isSupabaseConfigured = Boolean(url && anonKey)
const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null
const COLORS = ['#ef8354', '#e9c46a', '#4f8f7b', '#4e78a0', '#c7788b', '#8067a8']

function mapTrip(row: {
  id: string
  code: string
  name: string
  destinations: string[] | null
  created_at: string
}): Trip {
  return {
    id: row.id!,
    code: row.code!,
    name: row.name!,
    destinations: row.destinations ?? [],
    createdAt: row.created_at,
  }
}

function mapMember(row: Record<string, string>): Member {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }
}

async function loadSnapshot(code: string): Promise<TripSnapshot | null> {
  if (!supabase) return null
  const { data: tripRow, error } = await supabase.from('trips').select('*').eq('code', code).maybeSingle()
  if (error) throw error
  if (!tripRow) return null
  const [
    { data: memberRows, error: memberError },
    { data: dateRows, error: dateError },
    { data: noteRows, error: noteError },
  ] = await Promise.all([
    supabase.from('members').select('*').eq('trip_id', tripRow.id).order('created_at'),
    supabase.from('availability').select('member_id,date').eq('trip_id', tripRow.id),
    supabase.from('trip_notes').select('*').eq('trip_id', tripRow.id).order('created_at', { ascending: false }),
  ])
  if (memberError) throw memberError
  if (dateError) throw dateError
  if (noteError) throw noteError
  return {
    trip: mapTrip(tripRow),
    members: (memberRows ?? []).map(mapMember),
    availability: (dateRows ?? []).map((row): Availability => ({ memberId: row.member_id, date: row.date })),
    notes: (noteRows ?? []).map((row): TripNote => ({
      id: row.id,
      tripId: row.trip_id,
      memberId: row.member_id,
      title: row.title,
      body: row.body,
      url: row.url,
      createdAt: row.created_at,
    })),
  }
}

function createCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

async function hashCreatorToken(token: string) {
  const bytes = new TextEncoder().encode(token)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const supabaseStore: TripStore = {
  async createTrip(input: CreateTripInput) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const creatorToken = `${crypto.randomUUID()}${crypto.randomUUID()}`
    const { data: tripRow, error } = await supabase
      .from('trips')
      .insert({
        code: createCode(),
        name: input.name.trim(),
        destinations: (input.destinations ?? []).map((destination) => destination.trim()).filter(Boolean),
        creator_token_hash: await hashCreatorToken(creatorToken),
      })
      .select()
      .single()
    if (error) throw error
    const { data: memberRow, error: memberError } = await supabase
      .from('members')
      .insert({ trip_id: tripRow.id, name: input.memberName.trim(), color: COLORS[0] })
      .select()
      .single()
    if (memberError) throw memberError
    const snapshot = { trip: mapTrip(tripRow), members: [mapMember(memberRow)], availability: [], notes: [] }
    return { snapshot, member: snapshot.members[0], creatorToken }
  },

  findTrip: loadSnapshot,

  async joinTrip(code: string, memberName: string) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const snapshot = await loadSnapshot(code)
    if (!snapshot) throw new Error('We couldn’t find a trip with that code.')
    const { data, error } = await supabase
      .from('members')
      .insert({
        trip_id: snapshot.trip.id,
        name: memberName.trim(),
        color: COLORS[snapshot.members.length % COLORS.length],
      })
      .select()
      .single()
    if (error) throw error
    const member = mapMember(data)
    return { snapshot: { ...snapshot, members: [...snapshot.members, member] }, member }
  },

  async setAvailability(tripId: string, memberId: string, dates: string[]) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error: deleteError } = await supabase.from('availability').delete().eq('member_id', memberId)
    if (deleteError) throw deleteError
    if (dates.length) {
      const { error } = await supabase.from('availability').insert(
        dates.map((date) => ({ trip_id: tripId, member_id: memberId, date })),
      )
      if (error) throw error
    }
    const { data: trip } = await supabase.from('trips').select('code').eq('id', tripId).single()
    const snapshot = await loadSnapshot(trip!.code)
    if (!snapshot) throw new Error('This trip no longer exists.')
    return snapshot
  },

  async addNote(input) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.from('trip_notes').insert({
      trip_id: input.tripId,
      member_id: input.memberId,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      url: input.url?.trim() || null,
    })
    if (error) throw error
    const { data: trip } = await supabase.from('trips').select('code').eq('id', input.tripId).single()
    const snapshot = await loadSnapshot(trip!.code)
    if (!snapshot) throw new Error('This trip no longer exists.')
    return snapshot
  },

  async cancelTrip(tripId: string, creatorToken: string) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.rpc('cancel_trip', {
      target_trip_id: tripId,
      creator_token: creatorToken,
    })
    if (error) throw error
    if (!data) throw new Error('Only the trip creator can cancel this plan.')
  },

  async renameTrip(tripId: string, name: string, creatorToken: string) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.rpc('rename_trip', {
      target_trip_id: tripId,
      new_name: name.trim(),
      creator_token: creatorToken,
    })
    if (error) throw error
    if (!data) throw new Error('Only the trip creator can rename this plan.')
    const { data: trip } = await supabase.from('trips').select('code').eq('id', tripId).single()
    const snapshot = await loadSnapshot(trip!.code)
    if (!snapshot) throw new Error('This trip no longer exists.')
    return snapshot
  },

  watchTrip(code: string, onChange: (snapshot: TripSnapshot | null) => void) {
    if (!supabase) return () => undefined
    const channel = supabase
      .channel(`trip:${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, async () => {
        const snapshot = await loadSnapshot(code)
        onChange(snapshot)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, async () => {
        const snapshot = await loadSnapshot(code)
        if (snapshot) onChange(snapshot)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability' }, async () => {
        const snapshot = await loadSnapshot(code)
        if (snapshot) onChange(snapshot)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_notes' }, async () => {
        const snapshot = await loadSnapshot(code)
        if (snapshot) onChange(snapshot)
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  },
}
