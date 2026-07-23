import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, Check, Clipboard, Link2, LoaderCircle, MapPin, Users, X } from 'lucide-react'
import { Calendar } from './components/Calendar'
import { Logo } from './components/Logo'
import { OverlapPanel } from './components/OverlapPanel'
import { startOfMonth } from './lib/dates'
import { rememberedMember, rememberMember } from './lib/identity'
import { dataMode, store } from './lib/store'
import type { Member, TripSnapshot } from './types'

type Screen = 'home' | 'trip'

function currentCode() {
  return new URLSearchParams(window.location.search).get('trip')?.toUpperCase() ?? ''
}

function setUrl(code?: string) {
  const url = new URL(window.location.href)
  if (code) url.searchParams.set('trip', code)
  else url.searchParams.delete('trip')
  window.history.pushState({}, '', url)
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [snapshot, setSnapshot] = useState<TripSnapshot | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinName, setJoinName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showJoinName, setShowJoinName] = useState(false)
  const [pendingSnapshot, setPendingSnapshot] = useState<TripSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function openTrip(nextSnapshot: TripSnapshot, nextMember: Member) {
    rememberMember(nextSnapshot.trip.id, nextMember.id)
    setSnapshot(nextSnapshot)
    setMember(nextMember)
    setScreen('trip')
    setUrl(nextSnapshot.trip.code)
  }

  async function inspectCode(code: string) {
    setLoading(true)
    setError('')
    try {
      const found = await store.findTrip(code.trim().toUpperCase())
      if (!found) throw new Error('We couldn’t find that trip. Check the code and try again.')
      const savedId = rememberedMember(found.trip.id)
      const savedMember = found.members.find((item) => item.id === savedId)
      if (savedMember) {
        await openTrip(found, savedMember)
      } else {
        setPendingSnapshot(found)
        setShowJoinName(true)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const code = currentCode()
    if (code) {
      setJoinCode(code)
      void inspectCode(code)
    }
    const onBack = () => {
      const nextCode = currentCode()
      if (nextCode) void inspectCode(nextCode)
      else {
        setScreen('home')
        setSnapshot(null)
      }
    }
    window.addEventListener('popstate', onBack)
    return () => window.removeEventListener('popstate', onBack)
    // This should only inspect the initial URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!snapshot) return
    return store.watchTrip(snapshot.trip.code, setSnapshot)
  }, [snapshot?.trip.code])

  async function handleJoin(event: FormEvent) {
    event.preventDefault()
    if (joinCode.length < 6) {
      setError('Enter the six-character trip code.')
      return
    }
    await inspectCode(joinCode)
  }

  async function handleJoinName(event: FormEvent) {
    event.preventDefault()
    if (!pendingSnapshot || !joinName.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await store.joinTrip(pendingSnapshot.trip.code, joinName)
      setShowJoinName(false)
      await openTrip(result.snapshot, result.member)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not join this trip.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      {screen === 'home' || !snapshot || !member ? (
        <Home
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          onJoin={handleJoin}
          onCreate={() => setShowCreate(true)}
          loading={loading}
          error={error}
        />
      ) : (
        <TripView snapshot={snapshot} member={member} onSnapshot={setSnapshot} onExit={() => {
          setScreen('home')
          setSnapshot(null)
          setUrl()
        }} />
      )}
      {showCreate && (
        <CreateDialog
          onClose={() => setShowCreate(false)}
          onCreated={async (nextSnapshot, nextMember) => {
            setShowCreate(false)
            await openTrip(nextSnapshot, nextMember)
          }}
        />
      )}
      {showJoinName && pendingSnapshot && (
        <Dialog title={`Join “${pendingSnapshot.trip.name}”`} onClose={() => setShowJoinName(false)}>
          <form onSubmit={handleJoinName}>
            <p className="dialog-copy">What should your friends call you?</p>
            <label className="field">
              <span>Your name</span>
              <input autoFocus value={joinName} onChange={(event) => setJoinName(event.target.value)} placeholder="e.g. Dani" maxLength={32} />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="button button--primary button--wide" disabled={!joinName.trim() || loading}>
              {loading ? <LoaderCircle className="spin" size={18} /> : <>Join the trip <ArrowRight size={18} /></>}
            </button>
          </form>
        </Dialog>
      )}
    </main>
  )
}

function Home({ joinCode, setJoinCode, onJoin, onCreate, loading, error }: {
  joinCode: string
  setJoinCode: (value: string) => void
  onJoin: (event: FormEvent) => void
  onCreate: () => void
  loading: boolean
  error: string
}) {
  return (
    <div className="home">
      <header className="home-nav">
        <Logo />
        <span className="home-nav__note">Plan less. Go together.</span>
      </header>
      <section className="hero">
        <div className="hero__copy">
          <div className="eyebrow eyebrow--coral"><span>01</span> ROUND UP YOUR PEOPLE</div>
          <h1>Find the dates.<br /><em>Make the memories.</em></h1>
          <p className="hero__lede">The easiest way for friends to find a time that works—and turn “we should go somewhere” into an actual trip.</p>
          <div className="hero__actions">
            <button className="button button--primary" type="button" onClick={onCreate}>
              Start a new trip <ArrowRight size={18} />
            </button>
            <span>No signup needed</span>
          </div>
        </div>
        <div className="postcard" aria-hidden="true">
          <div className="postcard__sun" />
          <div className="postcard__mountain postcard__mountain--back" />
          <div className="postcard__mountain postcard__mountain--front" />
          <div className="postcard__stamp">LET'S<br />GO!</div>
          <p>somewhere<br /><strong>together</strong></p>
          <span className="postcard__scribble">↗ pick a date</span>
        </div>
      </section>
      <section className="join-strip">
        <div>
          <span className="step-number">02</span>
          <div>
            <strong>Already invited?</strong>
            <small>Pop in the code your friend sent.</small>
          </div>
        </div>
        <form onSubmit={onJoin}>
          <input
            aria-label="Trip code"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="TRIP CODE"
            maxLength={6}
          />
          <button className="button button--light" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={18} /> : <>Join trip <ArrowRight size={17} /></>}
          </button>
        </form>
        {error && <p className="join-strip__error">{error}</p>}
      </section>
      <section className="how-it-works">
        <span>HOW IT WORKS</span>
        <div><CalendarDays /><strong>Pick your days</strong><small>Tap every date you could get away.</small></div>
        <div><Users /><strong>Invite the crew</strong><small>One link. No accounts or group-chat chaos.</small></div>
        <div><MapPin /><strong>Spot the overlap</strong><small>See the dates that work for everyone.</small></div>
      </section>
      <footer>
        <Logo compact />
        <span>Made for trips that make it out of the group chat.</span>
        {dataMode === 'demo' && <span className="demo-badge">LOCAL DEMO</span>}
      </footer>
    </div>
  )
}

function CreateDialog({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (snapshot: TripSnapshot, member: Member) => void
}) {
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [memberName, setMemberName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await store.createTrip({ name, destination, memberName })
      onCreated(result.snapshot, result.member)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create your trip.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog title="Start a new trip" onClose={onClose}>
      <form onSubmit={submit}>
        <p className="dialog-copy">Give the plan a name. You can figure out the destination later.</p>
        <label className="field">
          <span>Trip name</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. The great summer escape" maxLength={60} />
        </label>
        <label className="field">
          <span>Destination <small>optional</small></span>
          <input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Somewhere sunny?" maxLength={60} />
        </label>
        <label className="field">
          <span>Your name</span>
          <input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="e.g. Dani" maxLength={32} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="button button--primary button--wide" disabled={!name.trim() || !memberName.trim() || loading}>
          {loading ? <LoaderCircle className="spin" size={18} /> : <>Create the trip <ArrowRight size={18} /></>}
        </button>
      </form>
    </Dialog>
  )
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <button className="dialog__close icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <div className="eyebrow eyebrow--coral">NEW ADVENTURE</div>
        <h2 id="dialog-title">{title}</h2>
        {children}
      </section>
    </div>
  )
}

function TripView({ snapshot, member, onSnapshot, onExit }: {
  snapshot: TripSnapshot
  member: Member
  onSnapshot: (snapshot: TripSnapshot) => void
  onExit: () => void
}) {
  const savedDates = useMemo(
    () => new Set(snapshot.availability.filter((item) => item.memberId === member.id).map((item) => item.date)),
    [snapshot.availability, member.id],
  )
  const [selected, setSelected] = useState(savedDates)
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    snapshot.availability.forEach(({ date }) => map.set(date, (map.get(date) ?? 0) + 1))
    return map
  }, [snapshot.availability])

  function toggle(key: string) {
    setSaved(false)
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function save() {
    setSaving(true)
    try {
      const next = await store.setAvailability(snapshot.trip.id, member.id, [...selected])
      onSnapshot(next)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="trip-page">
      <header className="trip-nav">
        <button className="logo-button" onClick={onExit} type="button"><Logo compact /></button>
        <div className="trip-nav__actions">
          <button className="code-chip" type="button" onClick={copyLink}>
            <span>TRIP CODE</span><strong>{snapshot.trip.code}</strong>
            {copied ? <Check size={16} /> : <Clipboard size={16} />}
          </button>
          <button className="button button--small button--dark" type="button" onClick={copyLink}>
            <Link2 size={16} /> {copied ? 'Copied!' : 'Invite friends'}
          </button>
        </div>
      </header>
      <section className="trip-heading">
        <div>
          <div className="eyebrow eyebrow--coral"><span>AVAILABILITY BOARD</span></div>
          <h1>{snapshot.trip.name}</h1>
          <p><MapPin size={16} /> {snapshot.trip.destination || 'Destination to be decided'} <i /> <Users size={16} /> {snapshot.members.length} traveler{snapshot.members.length === 1 ? '' : 's'}</p>
        </div>
        <div className="current-user">
          <span className="avatar" style={{ background: member.color }}>{member.name.slice(0, 1).toUpperCase()}</span>
          <div><small>CHOOSING AS</small><strong>{member.name}</strong></div>
        </div>
      </section>
      <section className="trip-workspace">
        <div className="calendar-column">
          <div className="instruction">
            <span>1</span>
            <div><strong>When could you go?</strong><small>Tap as many dates as you like. Tap again to remove one.</small></div>
            <div className="legend"><i /> Group availability</div>
          </div>
          <Calendar
            month={month}
            selected={selected}
            counts={counts}
            memberCount={snapshot.members.length}
            onMonthChange={setMonth}
            onToggle={toggle}
          />
          <div className="save-bar">
            <span><strong>{selected.size}</strong> date{selected.size === 1 ? '' : 's'} selected</span>
            <button className={`button button--primary ${saved ? 'is-saved' : ''}`} type="button" onClick={save} disabled={saving}>
              {saving ? <LoaderCircle className="spin" size={18} /> : saved ? <><Check size={18} /> Saved</> : <>Save my dates <ArrowRight size={18} /></>}
            </button>
          </div>
        </div>
        <OverlapPanel snapshot={snapshot} />
      </section>
      {dataMode === 'demo' && (
        <div className="demo-notice">
          <strong>Local demo mode</strong>
          <span>Add Supabase keys to sync this trip across devices.</span>
        </div>
      )}
    </div>
  )
}
