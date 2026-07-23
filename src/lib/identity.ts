const MEMBER_KEY = 'palsplan:members'

export function rememberMember(tripId: string, memberId: string) {
  const current = JSON.parse(localStorage.getItem(MEMBER_KEY) ?? '{}')
  localStorage.setItem(MEMBER_KEY, JSON.stringify({ ...current, [tripId]: memberId }))
}

export function rememberedMember(tripId: string): string | null {
  const current = JSON.parse(localStorage.getItem(MEMBER_KEY) ?? '{}')
  return current[tripId] ?? null
}
