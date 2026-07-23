import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, Check, Clipboard, Link2, LoaderCircle, MapPin, Pencil, ShieldAlert, Trash2, UserCheck, UserPlus, Users, X } from 'lucide-react'
import { Calendar } from './components/Calendar'
import { Logo } from './components/Logo'
import { NoteBoard } from './components/NoteBoard'
import { OverlapPanel } from './components/OverlapPanel'
import { startOfMonth } from './lib/dates'
import { creatorToken, forgetTripIdentity, rememberedMember, rememberCreatorToken, rememberMember } from './lib/identity'
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
  const [joinAsNew, setJoinAsNew] = useState(false)
  const [pendingSnapshot, setPendingSnapshot] = useState<TripSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function openTrip(nextSnapshot: TripSnapshot, nextMember: Member, nextCreatorToken?: string) {
    rememberMember(nextSnapshot.trip.id, nextMember.id)
    if (nextCreatorToken) rememberCreatorToken(nextSnapshot.trip.id, nextCreatorToken)
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
        setJoinAsNew(false)
        setJoinName('')
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
    return store.watchTrip(snapshot.trip.code, (next) => {
      if (next) {
        setSnapshot(next)
        return
      }
      setSnapshot(null)
      setMember(null)
      setScreen('home')
      setUrl()
      setError('This trip was canceled by its creator.')
    })
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
    const duplicate = pendingSnapshot.members.some(
      (existingMember) => existingMember.name.trim().toLocaleLowerCase() === joinName.trim().toLocaleLowerCase(),
    )
    if (duplicate) {
      setError('That traveler already exists. Go back and choose their name to recover the saved dates.')
      return
    }
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

  async function handleReturningMember(nextMember: Member) {
    if (!pendingSnapshot) return
    setShowJoinName(false)
    setJoinName('')
    await openTrip(pendingSnapshot, nextMember)
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
          error={showJoinName ? '' : error}
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
          onCreated={async (nextSnapshot, nextMember, nextCreatorToken) => {
            setShowCreate(false)
            await openTrip(nextSnapshot, nextMember, nextCreatorToken)
          }}
        />
      )}
      {showJoinName && pendingSnapshot && (
        <Dialog
          title={joinAsNew ? 'Join as someone new' : 'Have you been here before?'}
          eyebrow={joinAsNew ? 'A NEW TRAVELER' : 'WELCOME BACK'}
          onClose={() => setShowJoinName(false)}
        >
          {joinAsNew ? (
            <form onSubmit={handleJoinName}>
              <p className="dialog-copy">Add yourself to “{pendingSnapshot.trip.name}”.</p>
              <label className="field">
                <span>New traveler name</span>
                <input autoFocus value={joinName} onChange={(event) => setJoinName(event.target.value)} placeholder="e.g. Dani" maxLength={32} />
              </label>
              {error && <p className="form-error">{error}</p>}
              <div className="join-new-actions">
                <button className="button button--small button--ghost" type="button" onClick={() => {
                  setJoinAsNew(false)
                  setError('')
                }}>Back</button>
                <button className="button button--primary button--small" disabled={!joinName.trim() || loading}>
                  {loading ? <LoaderCircle className="spin" size={18} /> : <><UserPlus size={17} /> Add me</>}
                </button>
              </div>
            </form>
          ) : (
            <div className="returning-traveler">
              <p className="dialog-copy">Choose your name to reopen the dates you already saved in “{pendingSnapshot.trip.name}”.</p>
              <div className="traveler-options">
                {pendingSnapshot.members.map((existingMember) => {
                  const dateCount = pendingSnapshot.availability.filter((item) => item.memberId === existingMember.id).length
                  return (
                    <button className="traveler-option" type="button" key={existingMember.id} onClick={() => void handleReturningMember(existingMember)}>
                      <span className="avatar" style={{ background: existingMember.color }}>{existingMember.name.slice(0, 1).toUpperCase()}</span>
                      <span><strong>{existingMember.name}</strong><small>{dateCount ? `${dateCount} saved date${dateCount === 1 ? '' : 's'}` : 'No dates saved yet'}</small></span>
                      <UserCheck size={19} />
                    </button>
                  )
                })}
              </div>
              <button className="new-traveler-choice" type="button" onClick={() => setJoinAsNew(true)}>
                <span><UserPlus size={18} /></span>
                <span><strong>I’m new here</strong><small>Create another traveler in this trip</small></span>
                <ArrowRight size={17} />
              </button>
              <p className="identity-caution"><ShieldAlert size={14} /> Only choose your own name—this lets you edit that traveler’s dates.</p>
            </div>
          )}
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
  onCreated: (snapshot: TripSnapshot, member: Member, creatorToken: string) => void
}) {
  const [name, setName] = useState('')
  const [destinations, setDestinations] = useState([''])
  const [memberName, setMemberName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await store.createTrip({ name, destinations, memberName })
      onCreated(result.snapshot, result.member, result.creatorToken)
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
        <fieldset className="destination-fieldset">
          <legend>Destinations <small>optional</small></legend>
          <p>Add one stop, a whole route, or leave it open for now.</p>
          <div className="destination-stack">
            {destinations.map((destination, index) => (
              <div className="destination-input" key={index}>
                <MapPin size={16} aria-hidden="true" />
                <label className="sr-only" htmlFor={`destination-${index}`}>Destination {index + 1}</label>
                <input
                  id={`destination-${index}`}
                  value={destination}
                  onChange={(event) => setDestinations((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                  placeholder={index ? 'Add the next stop' : 'e.g. Lisbon'}
                  maxLength={60}
                />
                {destinations.length > 1 && (
                  <button
                    className="remove-destination"
                    type="button"
                    onClick={() => setDestinations((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    aria-label={`Remove destination ${index + 1}`}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {destinations.length < 8 && (
            <button className="add-destination" type="button" onClick={() => setDestinations((current) => [...current, ''])}>
              <span>+</span> Add another destination
            </button>
          )}
        </fieldset>
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

function Dialog({ title, onClose, children, eyebrow = 'NEW ADVENTURE' }: {
  title: string
  onClose: () => void
  children: React.ReactNode
  eyebrow?: string
}) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <button className="dialog__close icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <div className="eyebrow eyebrow--coral">{eyebrow}</div>
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
  const [showRename, setShowRename] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [renameName, setRenameName] = useState(snapshot.trip.name)
  const [confirmName, setConfirmName] = useState('')
  const [ownerWorking, setOwnerWorking] = useState(false)
  const [ownerError, setOwnerError] = useState('')
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null)
  const ownerToken = creatorToken(snapshot.trip.id)
  const filteredMember = snapshot.members.find((item) => item.id === filterMemberId) ?? null
  const filteredAvailability = useMemo(
    () => filterMemberId
      ? snapshot.availability.filter((item) => item.memberId === filterMemberId)
      : snapshot.availability,
    [snapshot.availability, filterMemberId],
  )
  const filteredDates = useMemo(
    () => new Set(filteredAvailability.map((item) => item.date)),
    [filteredAvailability],
  )

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    filteredAvailability.forEach(({ date }) => map.set(date, (map.get(date) ?? 0) + 1))
    return map
  }, [filteredAvailability])

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

  async function rename(event: FormEvent) {
    event.preventDefault()
    if (!ownerToken || !renameName.trim()) return
    setOwnerWorking(true)
    setOwnerError('')
    try {
      const next = await store.renameTrip(snapshot.trip.id, renameName, ownerToken)
      onSnapshot(next)
      setShowRename(false)
    } catch (reason) {
      setOwnerError(reason instanceof Error ? reason.message : 'Could not rename this trip.')
    } finally {
      setOwnerWorking(false)
    }
  }

  async function cancelTrip(event: FormEvent) {
    event.preventDefault()
    if (!ownerToken || confirmName !== snapshot.trip.name) return
    setOwnerWorking(true)
    setOwnerError('')
    try {
      await store.cancelTrip(snapshot.trip.id, ownerToken)
      forgetTripIdentity(snapshot.trip.id)
      onExit()
    } catch (reason) {
      setOwnerError(reason instanceof Error ? reason.message : 'Could not cancel this trip.')
      setOwnerWorking(false)
    }
  }

  function filterCalendar(memberId: string | null) {
    setFilterMemberId(memberId)
    if (window.matchMedia('(max-width: 940px)').matches) {
      window.setTimeout(() => document.querySelector('.calendar-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
    }
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
          <div className="trip-title-row">
            <h1>{snapshot.trip.name}</h1>
            {ownerToken && (
              <div className="owner-controls" aria-label="Creator controls">
                <button className="icon-button" type="button" onClick={() => {
                  setRenameName(snapshot.trip.name)
                  setOwnerError('')
                  setShowRename(true)
                }} aria-label="Rename trip">
                  <Pencil size={16} />
                </button>
                <button className="icon-button owner-controls__cancel" type="button" onClick={() => {
                  setConfirmName('')
                  setOwnerError('')
                  setShowCancel(true)
                }} aria-label="Cancel trip">
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
          <div className="trip-meta">
            <div className="destination-list">
              <MapPin size={16} />
              {snapshot.trip.destinations.length
                ? snapshot.trip.destinations.map((destination, index) => <span key={`${destination}-${index}`}>{destination}</span>)
                : <span>Destination to be decided</span>}
            </div>
            <i />
            <span className="traveler-count"><Users size={16} /> {snapshot.members.length} traveler{snapshot.members.length === 1 ? '' : 's'}</span>
          </div>
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
            <div className={`legend ${filteredMember ? 'is-filtering' : ''}`}>
              <i /> {filteredMember ? `${filteredMember.name} · ${filteredAvailability.length} date${filteredAvailability.length === 1 ? '' : 's'}` : 'Group availability'}
              {filteredMember && <button type="button" onClick={() => setFilterMemberId(null)} aria-label="Clear traveler filter"><X size={13} /></button>}
            </div>
          </div>
          <Calendar
            month={month}
            selected={selected}
            filteredDates={filteredMember ? filteredDates : undefined}
            counts={counts}
            memberCount={filteredMember ? 1 : snapshot.members.length}
            contextLabel={filteredMember ? `Viewing ${filteredMember.name}’s availability` : undefined}
            onMonthChange={setMonth}
            onToggle={toggle}
          />
          <div className="save-bar">
            <span><strong>{selected.size}</strong> date{selected.size === 1 ? '' : 's'} selected</span>
            <button className={`button button--primary ${saved ? 'is-saved' : ''}`} type="button" onClick={save} disabled={saving}>
              {saving ? <LoaderCircle className="spin" size={18} /> : saved ? <><Check size={18} /> Saved</> : <>Save my dates <ArrowRight size={18} /></>}
            </button>
          </div>
          <NoteBoard snapshot={snapshot} member={member} onSnapshot={onSnapshot} />
        </div>
        <OverlapPanel snapshot={snapshot} activeMemberId={filterMemberId} onFilterMember={filterCalendar} />
      </section>
      {dataMode === 'demo' && (
        <div className="demo-notice">
          <strong>Local demo mode</strong>
          <span>Add Supabase keys to sync this trip across devices.</span>
        </div>
      )}
      {showRename && (
        <Dialog title="Rename this trip" eyebrow="CREATOR CONTROL" onClose={() => setShowRename(false)}>
          <form onSubmit={rename}>
            <p className="dialog-copy">Give the plan a new name. Everyone in the trip will see it update.</p>
            <label className="field">
              <span>Trip name</span>
              <input autoFocus value={renameName} onChange={(event) => setRenameName(event.target.value)} maxLength={60} />
            </label>
            {ownerError && <p className="form-error">{ownerError}</p>}
            <button className="button button--primary button--wide" disabled={!renameName.trim() || renameName.trim() === snapshot.trip.name || ownerWorking}>
              {ownerWorking ? <LoaderCircle className="spin" size={18} /> : <><Pencil size={17} /> Save new name</>}
            </button>
          </form>
        </Dialog>
      )}
      {showCancel && (
        <Dialog title="Cancel this trip?" eyebrow="DANGER ZONE" onClose={() => setShowCancel(false)}>
          <form onSubmit={cancelTrip}>
            <p className="dialog-copy">This permanently removes the trip, everyone’s dates, and every pinned note. Type the trip name to confirm.</p>
            <label className="field">
              <span>Type “{snapshot.trip.name}”</span>
              <input autoFocus value={confirmName} onChange={(event) => setConfirmName(event.target.value)} />
            </label>
            {ownerError && <p className="form-error">{ownerError}</p>}
            <button className="button button--danger button--wide" disabled={confirmName !== snapshot.trip.name || ownerWorking}>
              {ownerWorking ? <LoaderCircle className="spin" size={18} /> : <><Trash2 size={17} /> Cancel trip permanently</>}
            </button>
          </form>
        </Dialog>
      )}
    </div>
  )
}
