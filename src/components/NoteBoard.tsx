import { FormEvent, useMemo, useState } from 'react'
import { ArrowUpRight, BedDouble, Link2, LoaderCircle, Plus, StickyNote, X } from 'lucide-react'
import { store } from '../lib/store'
import type { Member, TripSnapshot } from '../types'

function normalizeUrl(value: string) {
  const candidate = value.trim()
  if (!candidate) return ''
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`
  const parsed = new URL(withProtocol)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use a valid website link.')
  return parsed.toString()
}

function hostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

function safeUrl(value: string | null) {
  if (!value) return null
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null
  } catch {
    return null
  }
}

export function NoteBoard({
  snapshot,
  member,
  onSnapshot,
}: {
  snapshot: TripSnapshot
  member: Member
  onSnapshot: (snapshot: TripSnapshot) => void
}) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const membersById = useMemo(
    () => new Map(snapshot.members.map((item) => [item.id, item])),
    [snapshot.members],
  )

  function closeForm() {
    setAdding(false)
    setTitle('')
    setBody('')
    setUrl('')
    setError('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const next = await store.addNote({
        tripId: snapshot.trip.id,
        memberId: member.id,
        title,
        body,
        url: normalizeUrl(url),
      })
      onSnapshot(next)
      closeForm()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add this note.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="note-board" aria-labelledby="note-board-title">
      <div className="note-board__heading">
        <div>
          <div className="eyebrow eyebrow--coral"><StickyNote size={14} /> SHARED PINBOARD</div>
          <h2 id="note-board-title">Places & loose ideas</h2>
          <p>Pin an Airbnb, hotel, restaurant, or anything worth remembering.</p>
        </div>
        {!adding && (
          <button className="button button--dark button--small" type="button" onClick={() => setAdding(true)}>
            <Plus size={16} /> Add a note
          </button>
        )}
      </div>

      {adding && (
        <form className="note-composer" onSubmit={submit}>
          <button className="note-composer__close icon-button" type="button" onClick={closeForm} aria-label="Close note form">
            <X size={18} />
          </button>
          <div className="note-composer__icon"><BedDouble size={21} /></div>
          <div className="note-composer__fields">
            <label>
              <span>Title</span>
              <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Rooftop Airbnb in Getsemaní" maxLength={90} />
            </label>
            <label>
              <span>Link <small>optional</small></span>
              <div className="link-input"><Link2 size={15} /><input type="text" inputMode="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="airbnb.com/rooms/…" /></div>
            </label>
            <label className="note-composer__body">
              <span>Note <small>optional</small></span>
              <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Great terrace, sleeps six, free cancellation…" maxLength={500} rows={3} />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="note-composer__actions">
              <button type="button" className="button button--small button--ghost" onClick={closeForm}>Cancel</button>
              <button className="button button--primary button--small" disabled={!title.trim() || saving}>
                {saving ? <LoaderCircle className="spin" size={17} /> : <><StickyNote size={16} /> Pin it</>}
              </button>
            </div>
          </div>
        </form>
      )}

      {snapshot.notes.length ? (
        <div className="note-grid">
          {snapshot.notes.map((note, index) => {
            const author = membersById.get(note.memberId)
            const link = safeUrl(note.url)
            return (
              <article className={`note-card note-card--${index % 3}`} key={note.id}>
                <span className="note-card__tape" aria-hidden="true" />
                <div className="note-card__author">
                  <span className="avatar" style={{ background: author?.color ?? '#4f8f7b' }}>
                    {(author?.name ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span>PINNED BY {author?.name ?? 'A friend'}</span>
                </div>
                <h3>{note.title}</h3>
                {note.body && <p>{note.body}</p>}
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    <Link2 size={14} />
                    <span>{hostname(link)}</span>
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </article>
            )
          })}
        </div>
      ) : !adding ? (
        <button className="empty-pinboard" type="button" onClick={() => setAdding(true)}>
          <span><Plus size={22} /></span>
          <strong>Pin the first idea</strong>
          <small>Keep the good links from getting buried in the group chat.</small>
        </button>
      ) : null}
    </section>
  )
}
