import { Route } from 'lucide-react'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo" aria-label="Palsplan">
      <span className="logo__mark"><Route size={compact ? 18 : 22} strokeWidth={2.4} /></span>
      <span className="logo__word">palsplan</span>
    </div>
  )
}
