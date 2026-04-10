import { useState, useMemo } from 'react'

interface Match {
  text: string
  index: number
  groups: Record<string, string>
}

function runRegex(pattern: string, flags: string, testStr: string): { matches: Match[]; error: string | null } {
  if (!pattern) return { matches: [], error: null }
  try {
    // Always include 'g' for finding all matches, 'd' for indices
    const effectiveFlags = flags.includes('g') ? flags : flags + 'g'
    const re = new RegExp(pattern, effectiveFlags)
    const matches: Match[] = []
    let m: RegExpExecArray | null
    let safety = 0
    while ((m = re.exec(testStr)) !== null && safety < 1000) {
      matches.push({
        text: m[0],
        index: m.index,
        groups: m.groups ? { ...m.groups } : {},
      })
      if (m[0].length === 0) re.lastIndex++
      safety++
    }
    return { matches, error: null }
  } catch (e) {
    return { matches: [], error: (e as Error).message }
  }
}

function HighlightedText({ text, matches }: { text: string; matches: Match[] }) {
  if (matches.length === 0) {
    return <span className="text-zinc-400">{text}</span>
  }

  const parts: React.ReactNode[] = []
  let lastEnd = 0

  matches.forEach((match, i) => {
    if (match.index > lastEnd) {
      parts.push(
        <span key={`gap-${i}`} className="text-zinc-400">
          {text.slice(lastEnd, match.index)}
        </span>
      )
    }
    parts.push(
      <span
        key={`match-${i}`}
        className={`${i % 2 === 0 ? 'bg-amber-500/25 text-amber-300' : 'bg-sky-500/25 text-sky-300'} rounded px-0.5`}
      >
        {match.text}
      </span>
    )
    lastEnd = match.index + match.text.length
  })

  if (lastEnd < text.length) {
    parts.push(
      <span key="tail" className="text-zinc-400">
        {text.slice(lastEnd)}
      </span>
    )
  }

  return <>{parts}</>
}

export default function RegexTester() {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('g')
  const [testStr, setTestStr] = useState('')

  const { matches, error } = useMemo(
    () => runRegex(pattern, flags, testStr),
    [pattern, flags, testStr]
  )

  return (
    <div className="space-y-6">
      {/* Pattern */}
      <div>
        <label htmlFor="regex-pattern" className="block text-sm font-medium text-zinc-400 mb-2">
          Pattern
        </label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-zinc-500">
            <span className="text-zinc-500 pl-3 font-mono text-sm">/</span>
            <input
              id="regex-pattern"
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="your (regex|pattern) here"
              className="flex-1 bg-transparent px-1 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none font-mono"
              spellCheck={false}
            />
            <span className="text-zinc-500 font-mono text-sm">/</span>
          </div>
          <input
            type="text"
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-3 text-sm text-zinc-100 font-mono text-center focus:outline-none focus:border-zinc-500"
            placeholder="gim"
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {/* Test string */}
      <div>
        <label htmlFor="regex-test" className="block text-sm font-medium text-zinc-400 mb-2">
          Test String
        </label>
        <textarea
          id="regex-test"
          value={testStr}
          onChange={(e) => setTestStr(e.target.value)}
          placeholder="Enter text to test against..."
          rows={5}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono resize-y"
          spellCheck={false}
        />
      </div>

      {/* Highlighted result */}
      {testStr && pattern && !error && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-300">
              {matches.length} match{matches.length !== 1 ? 'es' : ''}
            </h3>
          </div>
          <div className="px-4 py-3 text-sm font-mono whitespace-pre-wrap break-all leading-relaxed">
            <HighlightedText text={testStr} matches={matches} />
          </div>
        </div>
      )}

      {/* Match details */}
      {matches.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300">Match Details</h3>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {matches.map((match, i) => (
              <div key={i} className="px-4 py-2.5 flex items-start gap-4">
                <span className="text-xs text-zinc-500 min-w-[24px] mt-0.5">#{i + 1}</span>
                <span className="text-sm font-mono text-amber-300">"{match.text}"</span>
                <span className="text-xs text-zinc-600 mt-0.5">@{match.index}</span>
                {Object.keys(match.groups).length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(match.groups).map(([name, val]) => (
                      <span key={name} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        <span className="text-zinc-500">{name}:</span> {val}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
