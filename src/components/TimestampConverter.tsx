import { useState, useMemo } from 'react'

function parseInput(input: string): Date | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Unix seconds
  if (/^\d{10}$/.test(trimmed)) {
    return new Date(parseInt(trimmed) * 1000)
  }
  // Unix milliseconds
  if (/^\d{13}$/.test(trimmed)) {
    return new Date(parseInt(trimmed))
  }
  // ISO 8601 or general date string
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) return d

  return null
}

function relativeTime(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const absDiff = Math.abs(diff)
  const future = diff > 0

  const seconds = Math.floor(absDiff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  let label: string
  if (years > 0) label = `${years} year${years > 1 ? 's' : ''}`
  else if (months > 0) label = `${months} month${months > 1 ? 's' : ''}`
  else if (days > 0) label = `${days} day${days > 1 ? 's' : ''}`
  else if (hours > 0) label = `${hours}h ${minutes % 60}m`
  else if (minutes > 0) label = `${minutes}m ${seconds % 60}s`
  else label = `${seconds}s`

  return future ? `in ${label}` : `${label} ago`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-sm text-zinc-500 min-w-[120px] shrink-0">{label}</span>
      <span className="text-sm font-mono text-zinc-100 break-all">{value}</span>
    </div>
  )
}

export default function TimestampConverter() {
  const [input, setInput] = useState('')
  const [nowKey, setNowKey] = useState(0)

  const date = useMemo(() => parseInput(input), [input])
  const now = useMemo(() => new Date(), [nowKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="ts-input" className="block text-sm font-medium text-zinc-400 mb-2">
          Paste a timestamp or date
        </label>
        <input
          id="ts-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="1712345678, 1712345678000, 2025-04-05T18:00:00Z, Mar 5 2025..."
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
          spellCheck={false}
        />
      </div>

      {/* Now button */}
      <button
        onClick={() => { setInput(String(Math.floor(Date.now() / 1000))); setNowKey((k) => k + 1) }}
        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
      >
        Use current time
      </button>

      {input.trim() && !date && (
        <p className="text-sm text-red-400">Could not parse that as a date or timestamp</p>
      )}

      {date && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden divide-y divide-zinc-800/50">
          <Row label="Relative" value={relativeTime(date)} />
          <Row label="Local" value={date.toLocaleString()} />
          <Row label="UTC" value={date.toUTCString()} />
          <Row label="ISO 8601" value={date.toISOString()} />
          <Row label="Unix (seconds)" value={String(Math.floor(date.getTime() / 1000))} />
          <Row label="Unix (ms)" value={String(date.getTime())} />
          <Row label="Day of week" value={date.toLocaleDateString(undefined, { weekday: 'long' })} />
        </div>
      )}

      {/* Reference: current time */}
      <div className="text-xs text-zinc-600 font-mono">
        Now: {now.toISOString()} ({Math.floor(now.getTime() / 1000)})
      </div>
    </div>
  )
}
