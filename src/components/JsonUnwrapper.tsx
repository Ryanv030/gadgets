import { useState, useCallback, useMemo } from 'react'

// Recursively unwrap stringified JSON within a parsed object
function deepUnwrap(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(trimmed)
        return deepUnwrap(parsed)
      } catch {
        // Not valid JSON, return as-is
      }
    }
    return value
  }
  if (Array.isArray(value)) {
    return value.map(deepUnwrap)
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = deepUnwrap(v)
    }
    return result
  }
  return value
}

// LangChain metadata keys that are usually noise
const LC_NOISE_KEYS = new Set([
  'lc', 'type', 'id', 'additional_kwargs', 'response_metadata', 'metadata',
])

// Extract the "interesting" content from a LangChain message
function extractLcContent(obj: unknown): { extracted: unknown; isLc: boolean } {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return { extracted: obj, isLc: false }
  }
  const record = obj as Record<string, unknown>
  // Detect LangChain constructor pattern
  if (record.lc !== undefined && record.kwargs !== undefined) {
    return { extracted: record.kwargs, isLc: true }
  }
  return { extracted: obj, isLc: false }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [text])
  return (
    <button
      onClick={copy}
      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
    >
      {copied ? 'copied' : 'copy'}
    </button>
  )
}

// Collapsible JSON tree node
function JsonNode({
  keyName,
  value,
  depth = 0,
  defaultCollapsed = false,
  isNoisy = false,
}: {
  keyName?: string
  value: unknown
  depth?: number
  defaultCollapsed?: boolean
  isNoisy?: boolean
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  if (value === null) {
    return (
      <Line keyName={keyName} isNoisy={isNoisy}>
        <span className="text-zinc-500">null</span>
      </Line>
    )
  }

  if (typeof value === 'boolean') {
    return (
      <Line keyName={keyName} isNoisy={isNoisy}>
        <span className="text-violet-400">{String(value)}</span>
      </Line>
    )
  }

  if (typeof value === 'number') {
    return (
      <Line keyName={keyName} isNoisy={isNoisy}>
        <span className="text-teal-400">{value}</span>
      </Line>
    )
  }

  if (typeof value === 'string') {
    // Long strings get their own treatment
    if (value.length > 120) {
      return (
        <div className={isNoisy ? 'opacity-40' : ''}>
          <Line keyName={keyName}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-zinc-500 hover:text-zinc-300 text-xs"
            >
              {collapsed ? `string (${value.length} chars) ▸` : '▾'}
            </button>
          </Line>
          {!collapsed && (
            <div className="ml-5 mt-1 mb-1 p-2 bg-zinc-800/50 rounded text-sm font-mono text-emerald-300 whitespace-pre-wrap break-all">
              {value}
            </div>
          )}
        </div>
      )
    }
    return (
      <Line keyName={keyName} isNoisy={isNoisy}>
        <span className="text-emerald-300">"{value}"</span>
      </Line>
    )
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <Line keyName={keyName} isNoisy={isNoisy}>
          <span className="text-zinc-500">[]</span>
        </Line>
      )
    }
    return (
      <div className={isNoisy ? 'opacity-40' : ''}>
        <Line keyName={keyName}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-zinc-500 hover:text-zinc-300 text-xs"
          >
            {collapsed ? `[${value.length} items] ▸` : `[${value.length}] ▾`}
          </button>
        </Line>
        {!collapsed && (
          <div className="ml-5 border-l border-zinc-800 pl-3">
            {value.map((item, i) => (
              <JsonNode key={i} keyName={String(i)} value={item} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      return (
        <Line keyName={keyName} isNoisy={isNoisy}>
          <span className="text-zinc-500">{'{}'}</span>
        </Line>
      )
    }
    return (
      <div className={isNoisy ? 'opacity-40' : ''}>
        <Line keyName={keyName}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-zinc-500 hover:text-zinc-300 text-xs"
          >
            {collapsed
              ? `{${entries.length} keys} ▸`
              : `{${entries.length}} ▾`}
          </button>
        </Line>
        {!collapsed && (
          <div className="ml-5 border-l border-zinc-800 pl-3">
            {entries.map(([k, v]) => {
              const noisy = LC_NOISE_KEYS.has(k) && isEmptyOrMeta(v)
              return (
                <JsonNode
                  key={k}
                  keyName={k}
                  value={v}
                  depth={depth + 1}
                  defaultCollapsed={noisy}
                  isNoisy={noisy}
                />
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return null
}

function Line({
  keyName,
  isNoisy = false,
  children,
}: {
  keyName?: string
  isNoisy?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`flex items-start gap-2 py-0.5 text-sm font-mono ${isNoisy ? 'opacity-40' : ''}`}>
      {keyName !== undefined && (
        <span className="text-amber-400 shrink-0">{keyName}:</span>
      )}
      {children}
    </div>
  )
}

function isEmptyOrMeta(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) return true
  if (Array.isArray(value) && value.length <= 4) return true
  if (typeof value === 'number') return true
  if (typeof value === 'string' && value.length < 100) return true
  return false
}

type ViewMode = 'unwrapped' | 'extracted' | 'raw'

export default function JsonUnwrapper() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<ViewMode>('unwrapped')

  const { parsed, error } = useMemo(() => {
    if (!input.trim()) return { parsed: null, error: null }
    try {
      const raw = JSON.parse(input.trim())
      return { parsed: raw, error: null }
    } catch (e) {
      return { parsed: null, error: (e as Error).message }
    }
  }, [input])

  const displayValue = useMemo(() => {
    if (!parsed) return null
    if (mode === 'raw') return parsed
    const unwrapped = deepUnwrap(parsed)
    if (mode === 'extracted') {
      const { extracted } = extractLcContent(unwrapped)
      return extracted
    }
    return unwrapped
  }, [parsed, mode])

  return (
    <div className="space-y-6">
      {/* Input */}
      <div>
        <label htmlFor="json-input" className="block text-sm font-medium text-zinc-400 mb-2">
          Paste JSON
        </label>
        <textarea
          id="json-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='{"input": "{\"nested\": \"json\", \"escaped\": \"values\"}"}'
          rows={6}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono resize-y"
          spellCheck={false}
        />
        {error && <p className="mt-2 text-sm text-red-400">Invalid JSON: {error}</p>}
      </div>

      {/* Controls */}
      {parsed && (
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            {(['unwrapped', 'extracted', 'raw'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === m
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {m === 'unwrapped' ? 'Unwrapped' : m === 'extracted' ? 'Extract Content' : 'Raw'}
              </button>
            ))}
          </div>
          <CopyButton text={JSON.stringify(displayValue, null, 2)} />
        </div>
      )}

      {/* Output */}
      {displayValue !== null && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 overflow-x-auto">
          <JsonNode value={displayValue} />
        </div>
      )}
    </div>
  )
}
