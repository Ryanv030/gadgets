import { useState, useMemo } from 'react'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
    >
      {copied ? 'copied' : 'copy'}
    </button>
  )
}

type Mode = 'encode' | 'decode'

export default function Base64Tool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>('decode')

  const result = useMemo(() => {
    if (!input.trim()) return { output: '', error: null }
    try {
      if (mode === 'decode') {
        // Handle URL-safe base64
        const normalized = input.trim().replace(/-/g, '+').replace(/_/g, '/')
        return { output: atob(normalized), error: null }
      } else {
        return { output: btoa(input), error: null }
      }
    } catch {
      return { output: '', error: mode === 'decode' ? 'Not valid base64' : 'Cannot encode (contains non-Latin1 characters)' }
    }
  }, [input, mode])

  // Try to pretty-print if the decoded output is JSON
  const prettyOutput = useMemo(() => {
    if (mode !== 'decode' || !result.output) return null
    try {
      const parsed = JSON.parse(result.output)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return null
    }
  }, [mode, result.output])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="b64-input" className="block text-sm font-medium text-zinc-400">
            {mode === 'decode' ? 'Paste base64 to decode' : 'Paste text to encode'}
          </label>
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            <button
              onClick={() => setMode('decode')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                mode === 'decode' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Decode
            </button>
            <button
              onClick={() => setMode('encode')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                mode === 'encode' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Encode
            </button>
          </div>
        </div>
        <textarea
          id="b64-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'decode' ? 'eyJhbGciOiJIUzI1NiJ9...' : 'Hello, World!'}
          rows={4}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono resize-y"
          spellCheck={false}
        />
        {result.error && <p className="mt-2 text-sm text-red-400">{result.error}</p>}
      </div>

      {result.output && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-300">
              {mode === 'decode' ? 'Decoded' : 'Encoded'}
            </h3>
            <CopyButton text={prettyOutput || result.output} />
          </div>
          <pre className="px-4 py-3 text-sm font-mono text-zinc-300 whitespace-pre-wrap break-all overflow-x-auto">
            {prettyOutput || result.output}
          </pre>
          {prettyOutput && (
            <div className="px-4 py-2 border-t border-zinc-800">
              <span className="text-xs text-zinc-500">Detected JSON — showing pretty-printed</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
