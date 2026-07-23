const MEMBER_KEY = 'palsplan:members'
const CREATOR_KEY = 'palsplan:creators'

export function rememberMember(tripId: string, memberId: string) {
  const current = JSON.parse(localStorage.getItem(MEMBER_KEY) ?? '{}')
  localStorage.setItem(MEMBER_KEY, JSON.stringify({ ...current, [tripId]: memberId }))
}

export function rememberedMember(tripId: string): string | null {
  const current = JSON.parse(localStorage.getItem(MEMBER_KEY) ?? '{}')
  return current[tripId] ?? null
}

export function rememberCreatorToken(tripId: string, token: string) {
  const current = JSON.parse(localStorage.getItem(CREATOR_KEY) ?? '{}')
  localStorage.setItem(CREATOR_KEY, JSON.stringify({ ...current, [tripId]: token }))
}

export function creatorToken(tripId: string): string | null {
  const current = JSON.parse(localStorage.getItem(CREATOR_KEY) ?? '{}')
  return current[tripId] ?? null
}

export function forgetTripIdentity(tripId: string) {
  for (const key of [MEMBER_KEY, CREATOR_KEY]) {
    const current = JSON.parse(localStorage.getItem(key) ?? '{}')
    delete current[tripId]
    localStorage.setItem(key, JSON.stringify(current))
  }
}
