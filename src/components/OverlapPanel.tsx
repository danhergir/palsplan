import { Check, Sparkles, Users } from 'lucide-react'
import { formatFriendlyDate } from '../lib/dates'
import type { TripSnapshot } from '../types'

export function OverlapPanel({ snapshot, activeMemberId, onFilterMember }: {
  snapshot: TripSnapshot
  activeMemberId: string | null
  onFilterMember: (memberId: string | null) => void
}) {
  const totals = new Map<string, string[]>()
  snapshot.availability.forEach(({ date, memberId }) => {
    totals.set(date, [...(totals.get(date) ?? []), memberId])
  })
  const ranked = [...totals.entries()]
    .sort(([dateA, membersA], [dateB, membersB]) => membersB.length - membersA.length || dateA.localeCompare(dateB))
  const perfect = ranked.filter(([, members]) => members.length === snapshot.members.length)
  const best = perfect.length ? perfect : ranked.slice(0, 4)

  return (
    <aside className="overlap-panel">
      <div className="eyebrow"><Sparkles size={14} /> GROUP SWEET SPOT</div>
      {best.length ? (
        <>
          <h2>{perfect.length ? `${perfect.length} date${perfect.length === 1 ? '' : 's'} fit everyone` : 'Your best dates so far'}</h2>
          <p className="panel-intro">
            {perfect.length
              ? 'Looks like the group found some common ground.'
              : 'More answers will make the clearest dates rise to the top.'}
          </p>
          <div className="best-dates">
            {best.slice(0, 5).map(([date, memberIds], index) => (
              <div className="best-date" key={date}>
                <span className="best-date__rank">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{formatFriendlyDate(date)}</strong>
                  <span><Users size={13} /> {memberIds.length} of {snapshot.members.length} can go</span>
                </div>
                {memberIds.length === snapshot.members.length && <Check className="best-date__check" size={18} />}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-match">
          <div className="empty-match__orbit"><Users size={24} /></div>
          <h2>The good dates will appear here</h2>
          <p>Pick your availability, then invite the crew. We’ll surface the days that work best.</p>
        </div>
      )}
      <div className="crew-list">
        <span className="crew-list__label">FILTER CALENDAR · {snapshot.members.length} TRAVELER{snapshot.members.length === 1 ? '' : 'S'}</span>
        <button className={`crew-member crew-member--all ${activeMemberId === null ? 'is-active' : ''}`} type="button" aria-pressed={activeMemberId === null} onClick={() => onFilterMember(null)}>
          <span className="crew-all-icon"><Users size={15} /></span>
          <span>Everyone</span>
          <small>Group overlap</small>
        </button>
        {snapshot.members.map((member) => {
          const days = snapshot.availability.filter((item) => item.memberId === member.id).length
          return (
            <button className={`crew-member ${activeMemberId === member.id ? 'is-active' : ''}`} type="button" aria-pressed={activeMemberId === member.id} onClick={() => onFilterMember(member.id)} key={member.id}>
              <span className="avatar" style={{ background: member.color }}>{member.name.slice(0, 1).toUpperCase()}</span>
              <span>{member.name}</span>
              <small>{days ? `${days} day${days === 1 ? '' : 's'}` : 'Waiting'}</small>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
