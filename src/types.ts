export type Trip = {
  id: string
  code: string
  name: string
  destinations: string[]
  createdAt: string
}

export type Member = {
  id: string
  tripId: string
  name: string
  color: string
  createdAt: string
}

export type Availability = {
  memberId: string
  date: string
}

export type TripNote = {
  id: string
  tripId: string
  memberId: string
  title: string
  body: string | null
  url: string | null
  createdAt: string
}

export type TripSnapshot = {
  trip: Trip
  members: Member[]
  availability: Availability[]
  notes: TripNote[]
}

export type CreateTripInput = {
  name: string
  destinations?: string[]
  memberName: string
}

export interface TripStore {
  createTrip(input: CreateTripInput): Promise<{ snapshot: TripSnapshot; member: Member; creatorToken: string }>
  findTrip(code: string): Promise<TripSnapshot | null>
  joinTrip(code: string, memberName: string): Promise<{ snapshot: TripSnapshot; member: Member }>
  setAvailability(tripId: string, memberId: string, dates: string[]): Promise<TripSnapshot>
  addNote(input: {
    tripId: string
    memberId: string
    title: string
    body?: string
    url?: string
  }): Promise<TripSnapshot>
  renameTrip(tripId: string, name: string, creatorToken: string): Promise<TripSnapshot>
  cancelTrip(tripId: string, creatorToken: string): Promise<void>
  watchTrip(code: string, onChange: (snapshot: TripSnapshot | null) => void): () => void
}
