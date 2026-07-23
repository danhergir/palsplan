import type { CreateTripInput, Member, TripSnapshot, TripStore } from '../types'

const STORAGE_KEY = 'palsplan:trips'
const OWNER_KEY = 'palsplan:trip-owners'
const COLORS = ['#ef8354', '#e9c46a', '#4f8f7b', '#4e78a0', '#c7788b', '#8067a8']

function readAll(): Record<string, TripSnapshot> {
  const trips: Record<string, TripSnapshot> = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  Object.values(trips).forEach((snapshot) => {
    snapshot.notes ??= []
  })
  return trips
}

function writeAll(trips: Record<string, TripSnapshot>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
  window.dispatchEvent(new CustomEvent('palsplan:updated'))
}

function code() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

function id() {
  return crypto.randomUUID()
}

function newMember(tripId: string, name: string, index: number): Member {
  return {
    id: id(),
    tripId,
    name: name.trim(),
    color: COLORS[index % COLORS.length],
    createdAt: new Date().toISOString(),
  }
}

export const localStore: TripStore = {
  async createTrip(input: CreateTripInput) {
    const all = readAll()
    let tripCode = code()
    while (all[tripCode]) tripCode = code()
    const tripId = id()
    const creatorToken = `${id()}${id()}`
    const trip = {
      id: tripId,
      code: tripCode,
      name: input.name.trim(),
      destinations: (input.destinations ?? []).map((destination) => destination.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    }
    const member = newMember(tripId, input.memberName, 0)
    const snapshot = { trip, members: [member], availability: [], notes: [] }
    all[tripCode] = snapshot
    const owners = JSON.parse(localStorage.getItem(OWNER_KEY) ?? '{}')
    localStorage.setItem(OWNER_KEY, JSON.stringify({ ...owners, [tripId]: creatorToken }))
    writeAll(all)
    return { snapshot, member, creatorToken }
  },

  async findTrip(tripCode: string) {
    return readAll()[tripCode.toUpperCase()] ?? null
  },

  async joinTrip(tripCode: string, memberName: string) {
    const all = readAll()
    const key = tripCode.toUpperCase()
    const snapshot = all[key]
    if (!snapshot) throw new Error('We couldn’t find a trip with that code.')
    const member = newMember(snapshot.trip.id, memberName, snapshot.members.length)
    const updated = { ...snapshot, members: [...snapshot.members, member] }
    all[key] = updated
    writeAll(all)
    return { snapshot: updated, member }
  },

  async setAvailability(tripId: string, memberId: string, dates: string[]) {
    const all = readAll()
    const key = Object.keys(all).find((tripCode) => all[tripCode].trip.id === tripId)
    if (!key) throw new Error('This trip no longer exists.')
    const snapshot = all[key]
    const availability = snapshot.availability.filter((item) => item.memberId !== memberId)
    availability.push(...dates.map((date) => ({ memberId, date })))
    const updated = { ...snapshot, availability }
    all[key] = updated
    writeAll(all)
    return updated
  },

  async addNote(input) {
    const all = readAll()
    const key = Object.keys(all).find((tripCode) => all[tripCode].trip.id === input.tripId)
    if (!key) throw new Error('This trip no longer exists.')
    const snapshot = all[key]
    const note = {
      id: id(),
      tripId: input.tripId,
      memberId: input.memberId,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      url: input.url?.trim() || null,
      createdAt: new Date().toISOString(),
    }
    const updated = { ...snapshot, notes: [note, ...snapshot.notes] }
    all[key] = updated
    writeAll(all)
    return updated
  },

  async cancelTrip(tripId: string, creatorToken: string) {
    const owners = JSON.parse(localStorage.getItem(OWNER_KEY) ?? '{}')
    if (!creatorToken || owners[tripId] !== creatorToken) {
      throw new Error('Only the trip creator can cancel this plan.')
    }
    const all = readAll()
    const key = Object.keys(all).find((tripCode) => all[tripCode].trip.id === tripId)
    if (!key) throw new Error('This trip no longer exists.')
    delete all[key]
    delete owners[tripId]
    localStorage.setItem(OWNER_KEY, JSON.stringify(owners))
    writeAll(all)
  },

  async renameTrip(tripId: string, name: string, creatorToken: string) {
    const owners = JSON.parse(localStorage.getItem(OWNER_KEY) ?? '{}')
    if (!creatorToken || owners[tripId] !== creatorToken) {
      throw new Error('Only the trip creator can rename this plan.')
    }
    const all = readAll()
    const key = Object.keys(all).find((tripCode) => all[tripCode].trip.id === tripId)
    if (!key) throw new Error('This trip no longer exists.')
    const updated = { ...all[key], trip: { ...all[key].trip, name: name.trim() } }
    all[key] = updated
    writeAll(all)
    return updated
  },

  watchTrip(tripCode: string, onChange: (snapshot: TripSnapshot) => void) {
    const update = () => {
      const snapshot = readAll()[tripCode.toUpperCase()]
      onChange(snapshot ?? null)
    }
    window.addEventListener('storage', update)
    window.addEventListener('palsplan:updated', update)
    return () => {
      window.removeEventListener('storage', update)
      window.removeEventListener('palsplan:updated', update)
    }
  },
}
