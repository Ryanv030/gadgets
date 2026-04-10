import { useState, useMemo } from 'react'

const FIELD_NAMES = ['minute', 'hour', 'day of month', 'month', 'day of week'] as const
const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function explainField(field: string, name: typeof FIELD_NAMES[number]): string {
  if (field === '*') return `every ${name}`

  // */n
  const stepMatch = field.match(/^\*\/(\d+)$/)
  if (stepMatch) return `every ${stepMatch[1]} ${name}${name === 'minute' || name === 'hour' ? 's' : ''}`

  // range: n-m
  const rangeMatch = field.match(/^(\d+)-(\d+)$/)
  if (rangeMatch) {
    const [, start, end] = rangeMatch
    if (name === 'month') return `${MONTH_NAMES[+start]} through ${MONTH_NAMES[+end]}`
    if (name === 'day of week') return `${DAY_NAMES[+start]} through ${DAY_NAMES[+end]}`
    return `${name} ${start} through ${end}`
  }

  // list: n,m,o
  if (field.includes(',')) {
    const parts = field.split(',')
    if (name === 'day of week') return parts.map((p) => DAY_NAMES[+p] || p).join(', ')
    if (name === 'month') return parts.map((p) => MONTH_NAMES[+p] || p).join(', ')
    return `${name} ${parts.join(', ')}`
  }

  // single value
  if (/^\d+$/.test(field)) {
    const n = parseInt(field)
    if (name === 'minute') return `at minute ${n}`
    if (name === 'hour') return `at ${n}:00`
    if (name === 'day of month') return `on day ${n}`
    if (name === 'month') return `in ${MONTH_NAMES[n] || field}`
    if (name === 'day of week') return `on ${DAY_NAMES[n] || field}`
  }

  return `${name}: ${field}`
}

function buildSummary(fields: string[]): string {
  if (fields.length !== 5) return ''

  const [min, hour, dom, month, dow] = fields
  const parts: string[] = []

  // Time
  if (min !== '*' && hour !== '*' && /^\d+$/.test(min) && /^\d+$/.test(hour)) {
    parts.push(`At ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`)
  } else {
    if (min.startsWith('*/')) parts.push(`Every ${min.slice(2)} minutes`)
    else if (min !== '*' && /^\d+$/.test(min)) parts.push(`At minute ${min}`)
    else if (min === '*') parts.push('Every minute')

    if (hour.startsWith('*/')) parts.push(`every ${hour.slice(2)} hours`)
    else if (hour !== '*' && /^\d+$/.test(hour)) parts.push(`past hour ${hour}`)
  }

  // Day of month
  if (dom !== '*') {
    if (/^\d+$/.test(dom)) parts.push(`on day ${dom}`)
    else parts.push(`on ${dom}`)
  }

  // Month
  if (month !== '*') {
    if (month.includes('-')) {
      const [s, e] = month.split('-')
      parts.push(`in ${MONTH_NAMES[+s]}–${MONTH_NAMES[+e]}`)
    } else if (month.includes(',')) {
      parts.push(`in ${month.split(',').map((m) => MONTH_NAMES[+m] || m).join(', ')}`)
    } else if (/^\d+$/.test(month)) {
      parts.push(`in ${MONTH_NAMES[+month]}`)
    }
  }

  // Day of week
  if (dow !== '*') {
    if (dow.includes('-')) {
      const [s, e] = dow.split('-')
      parts.push(`${DAY_NAMES[+s]}–${DAY_NAMES[+e]}`)
    } else if (dow.includes(',')) {
      parts.push(dow.split(',').map((d) => DAY_NAMES[+d] || d).join(', '))
    } else if (/^\d+$/.test(dow)) {
      parts.push(`on ${DAY_NAMES[+dow]}`)
    }
  }

  return parts.join(', ')
}

function getNextRuns(fields: string[], count: number): Date[] {
  if (fields.length !== 5) return []

  const runs: Date[] = []
  const now = new Date()
  const check = new Date(now)
  check.setSeconds(0, 0)

  // Brute force: step minute-by-minute up to 1 year
  const limit = 525960 // ~1 year in minutes
  for (let i = 0; i < limit && runs.length < count; i++) {
    check.setMinutes(check.getMinutes() + (i === 0 ? 1 : 1))
    if (i === 0) check.setMinutes(check.getMinutes()) // skip current minute

    if (matchesCron(fields, check)) {
      runs.push(new Date(check))
    }
  }
  return runs
}

function matchesCron(fields: string[], date: Date): boolean {
  const values = [
    date.getMinutes(),
    date.getHours(),
    date.getDate(),
    date.getMonth() + 1,
    date.getDay(),
  ]
  return fields.every((field, i) => matchesField(field, values[i]))
}

function matchesField(field: string, value: number): boolean {
  if (field === '*') return true
  // Step
  const stepMatch = field.match(/^\*\/(\d+)$/)
  if (stepMatch) return value % parseInt(stepMatch[1]) === 0
  // List
  if (field.includes(',')) return field.split(',').some((p) => matchesField(p.trim(), value))
  // Range
  const rangeMatch = field.match(/^(\d+)-(\d+)$/)
  if (rangeMatch) return value >= parseInt(rangeMatch[1]) && value <= parseInt(rangeMatch[2])
  // Exact
  return parseInt(field) === value
}

export default function CronExplainer() {
  const [input, setInput] = useState('')

  const fields = useMemo(() => {
    const parts = input.trim().split(/\s+/)
    if (parts.length === 5) return parts
    return null
  }, [input])

  const summary = useMemo(() => fields ? buildSummary(fields) : '', [fields])
  const nextRuns = useMemo(() => fields ? getNextRuns(fields, 5) : [], [fields])

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="cron-input" className="block text-sm font-medium text-zinc-400 mb-2">
          Cron Expression
        </label>
        <input
          id="cron-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="*/15 9-17 * * 1-5"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
          spellCheck={false}
        />
        {input.trim() && !fields && (
          <p className="mt-2 text-sm text-red-400">Expected 5 fields: minute hour day-of-month month day-of-week</p>
        )}
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-2">
        {[
          ['Every minute', '* * * * *'],
          ['Hourly', '0 * * * *'],
          ['Daily midnight', '0 0 * * *'],
          ['Weekdays 9am', '0 9 * * 1-5'],
          ['Every 15 min', '*/15 * * * *'],
        ].map(([label, expr]) => (
          <button
            key={expr}
            onClick={() => setInput(expr)}
            className="px-2.5 py-1 text-xs rounded border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {fields && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-900/50">
            <p className="text-lg text-zinc-100">{summary}</p>
          </div>

          {/* Field breakdown */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-300">Fields</h3>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {fields.map((field, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="text-sm font-mono text-amber-400 min-w-[60px]">{field}</span>
                  <span className="text-sm text-zinc-400">{explainField(field, FIELD_NAMES[i])}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Next runs */}
          {nextRuns.length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-300">Next 5 Runs</h3>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {nextRuns.map((run, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="text-xs text-zinc-600 min-w-[16px]">{i + 1}</span>
                    <span className="text-sm font-mono text-zinc-300">
                      {run.toLocaleString(undefined, {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
