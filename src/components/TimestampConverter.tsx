import { useState, useMemo, useEffect } from 'react'

const SHEETS_EPOCH_OFFSET_DAYS = 25569 // days between 1899-12-30 and 1970-01-01
const MS_PER_DAY = 86400 * 1000

type Parsed = { date: Date; sheetsSerial: number; source: 'unix-s' | 'unix-ms' | 'sheets' | 'date-string' }

// Sheets serials are wall-clock-in-spreadsheet-tz; treat as local so the
// displayed Local row matches what users see in the cell.
function sheetsSerialToDate(serial: number): Date {
  const utc = new Date((serial - SHEETS_EPOCH_OFFSET_DAYS) * MS_PER_DAY)
  return new Date(utc.getTime() + utc.getTimezoneOffset() * 60 * 1000)
}

function dateToSheetsSerial(date: Date): number {
  const localMs = date.getTime() - date.getTimezoneOffset() * 60 * 1000
  return localMs / MS_PER_DAY + SHEETS_EPOCH_OFFSET_DAYS
}

function parseInput(input: string): Parsed | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (/^\d{10}$/.test(trimmed)) {
    const date = new Date(parseInt(trimmed) * 1000)
    return { date, sheetsSerial: dateToSheetsSerial(date), source: 'unix-s' }
  }
  if (/^\d{13}$/.test(trimmed)) {
    const date = new Date(parseInt(trimmed))
    return { date, sheetsSerial: dateToSheetsSerial(date), source: 'unix-ms' }
  }
  // Plain number that isn't 10/13 digits: treat as a Sheets serial when it
  // falls in a plausible spreadsheet range (1 = 1899-12-31, 100000 ≈ year 2173).
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = parseFloat(trimmed)
    if (num > 0 && num < 100000) {
      const date = sheetsSerialToDate(num)
      if (!isNaN(date.getTime())) return { date, sheetsSerial: num, source: 'sheets' }
    }
  }
  const date = new Date(trimmed)
  if (!isNaN(date.getTime())) {
    return { date, sheetsSerial: dateToSheetsSerial(date), source: 'date-string' }
  }
  return null
}

function formatSerial(n: number): string {
  // Trim to 8 fractional digits — enough for ms precision, no float noise.
  return String(Math.round(n * 1e8) / 1e8)
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
  const [now, setNow] = useState<Date | null>(null)

  // Populate after mount so SSR HTML doesn't bake in a build-time timestamp
  // that mismatches the client-rendered one.
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const parsed = useMemo(() => parseInput(input), [input])
  const date = parsed?.date ?? null

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
          placeholder="1712345678, 46141.9316, 2025-04-05T18:00:00Z, Mar 5 2025..."
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
          spellCheck={false}
        />
      </div>

      {/* Now button */}
      <button
        onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}
        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
      >
        Use current time
      </button>

      {input.trim() && !date && (
        <p className="text-sm text-red-400">Could not parse that as a date or timestamp</p>
      )}

      {parsed && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden divide-y divide-zinc-800/50">
          <Row label="Relative" value={relativeTime(parsed.date)} />
          <Row label="Local" value={parsed.date.toLocaleString()} />
          <Row label="UTC" value={parsed.date.toUTCString()} />
          <Row label="ISO 8601" value={parsed.date.toISOString()} />
          <Row label="Unix (seconds)" value={String(Math.floor(parsed.date.getTime() / 1000))} />
          <Row label="Unix (ms)" value={String(parsed.date.getTime())} />
          <Row label="Sheets serial" value={formatSerial(parsed.sheetsSerial)} />
          <Row label="Day of week" value={parsed.date.toLocaleDateString(undefined, { weekday: 'long' })} />
        </div>
      )}

      {/* Reference: current time. Rendered only post-mount to avoid hydration mismatch. */}
      <div className="text-xs text-zinc-600 font-mono min-h-[1rem]">
        {now && <>Now: {now.toISOString()} ({Math.floor(now.getTime() / 1000)})</>}
      </div>
    </div>
  )
}
