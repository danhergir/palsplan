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

export type TripSnapshot = {
  trip: Trip
  members: Member[]
  availability: Availability[]
}

export type CreateTripInput = {
  name: string
  destinations?: string[]
  memberName: string
}

export interface TripStore {
  createTrip(input: CreateTripInput): Promise<{ snapshot: TripSnapshot; member: Member }>
  findTrip(code: string): Promise<TripSnapshot | null>
  joinTrip(code: string, memberName: string): Promise<{ snapshot: TripSnapshot; member: Member }>
  setAvailability(tripId: string, memberId: string, dates: string[]): Promise<TripSnapshot>
  watchTrip(code: string, onChange: (snapshot: TripSnapshot) => void): () => void
}
