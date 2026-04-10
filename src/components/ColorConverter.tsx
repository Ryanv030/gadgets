import { useState, useMemo, useCallback } from 'react'

interface Color {
  r: number; g: number; b: number; a: number
}

function parseColor(input: string): Color | null {
  const trimmed = input.trim().toLowerCase()

  // Hex: #rgb, #rrggbb, #rrggbbaa
  const hexMatch = trimmed.match(/^#?([0-9a-f]{3,8})$/)
  if (hexMatch) {
    const hex = hexMatch[1]
    if (hex.length === 3) {
      return { r: parseInt(hex[0] + hex[0], 16), g: parseInt(hex[1] + hex[1], 16), b: parseInt(hex[2] + hex[2], 16), a: 1 }
    }
    if (hex.length === 6) {
      return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: 1 }
    }
    if (hex.length === 8) {
      return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: parseInt(hex.slice(6, 8), 16) / 255 }
    }
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/)
  if (rgbMatch) {
    return { r: +rgbMatch[1], g: +rgbMatch[2], b: +rgbMatch[3], a: rgbMatch[4] !== undefined ? +rgbMatch[4] : 1 }
  }

  // hsl(h, s%, l%) or hsla(h, s%, l%, a)
  const hslMatch = trimmed.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*(?:,\s*([\d.]+))?\s*\)/)
  if (hslMatch) {
    return hslToRgb(+hslMatch[1], +hslMatch[2], +hslMatch[3], hslMatch[4] !== undefined ? +hslMatch[4] : 1)
  }

  return null
}

function hslToRgb(h: number, s: number, l: number, a: number): Color {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const f = (n: number) => l - (s * Math.min(l, 1 - l)) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255), a }
}

function rgbToHsl(c: Color): { h: number; s: number; l: number } {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

// sRGB to linear
function srgbToLinear(c: number): number {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

// Linear sRGB to OKLab
function rgbToOklch(c: Color): { l: number; c: number; h: number } {
  const lr = srgbToLinear(c.r), lg = srgbToLinear(c.g), lb = srgbToLinear(c.b)
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  const C = Math.sqrt(a * a + b * b)
  let H = Math.atan2(b, a) * 180 / Math.PI
  if (H < 0) H += 360
  return {
    l: Math.round(L * 1000) / 1000,
    c: Math.round(C * 1000) / 1000,
    h: Math.round(H * 100) / 100,
  }
}

function toHex(c: Color): string {
  const hex = [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')
  return `#${hex}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [text])
  return (
    <button onClick={copy} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
      {copied ? 'copied' : 'copy'}
    </button>
  )
}

function FormatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2.5 flex items-center gap-3">
      <span className="text-sm text-zinc-500 min-w-[60px] shrink-0">{label}</span>
      <span className="text-sm font-mono text-zinc-100 flex-1 break-all">{value}</span>
      <CopyButton text={value} />
    </div>
  )
}

export default function ColorConverter() {
  const [input, setInput] = useState('')

  const color = useMemo(() => parseColor(input), [input])
  const hsl = useMemo(() => color ? rgbToHsl(color) : null, [color])
  const oklch = useMemo(() => color ? rgbToOklch(color) : null, [color])
  const hex = useMemo(() => color ? toHex(color) : null, [color])

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="color-input" className="block text-sm font-medium text-zinc-400 mb-2">
          Paste a color
        </label>
        <input
          id="color-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="#ff6600, rgb(255, 102, 0), hsl(24, 100%, 50%)"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
          spellCheck={false}
        />
        {input.trim() && !color && (
          <p className="mt-2 text-sm text-red-400">Could not parse that color</p>
        )}
      </div>

      {color && hex && hsl && oklch && (
        <div className="space-y-4">
          {/* Preview swatch */}
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-lg border border-zinc-700"
              style={{ backgroundColor: hex }}
            />
            <div
              className="flex-1 h-20 rounded-lg border border-zinc-700"
              style={{ backgroundColor: hex }}
            />
          </div>

          {/* Formats */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden divide-y divide-zinc-800/50">
            <FormatRow label="HEX" value={hex} />
            <FormatRow label="RGB" value={`rgb(${color.r}, ${color.g}, ${color.b})`} />
            {color.a < 1 && (
              <FormatRow label="RGBA" value={`rgba(${color.r}, ${color.g}, ${color.b}, ${color.a.toFixed(2)})`} />
            )}
            <FormatRow label="HSL" value={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} />
            <FormatRow label="OKLCH" value={`oklch(${(oklch.l * 100).toFixed(1)}% ${oklch.c.toFixed(3)} ${oklch.h.toFixed(1)})`} />
          </div>
        </div>
      )}
    </div>
  )
}
