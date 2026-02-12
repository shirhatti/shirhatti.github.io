import { describe, it, expect } from 'vitest'
import { normalizeArg, preprocessArgs } from './shell'

// ── normalizeArg ─────────────────────────────────────────────

describe('normalizeArg', () => {
  it('returns a bare slug unchanged', () => {
    expect(normalizeArg('welcome')).toBe('welcome')
  })

  it('strips leading ./', () => {
    expect(normalizeArg('./welcome')).toBe('welcome')
  })

  it('strips leading ~/', () => {
    expect(normalizeArg('~/welcome')).toBe('welcome')
  })

  it('strips leading /', () => {
    expect(normalizeArg('/welcome')).toBe('welcome')
  })

  it('takes the basename from a path', () => {
    expect(normalizeArg('posts/welcome')).toBe('welcome')
  })

  it('handles nested paths', () => {
    expect(normalizeArg('posts/2025/01/welcome')).toBe('welcome')
  })

  it('strips .md extension', () => {
    expect(normalizeArg('welcome.md')).toBe('welcome')
  })

  it('strips date prefix from basename', () => {
    expect(normalizeArg('01-welcome')).toBe('welcome')
  })

  it('handles full path with all components', () => {
    expect(normalizeArg('./posts/2025/01/01-welcome.md')).toBe('welcome')
  })

  it('handles relative path with extension', () => {
    expect(normalizeArg('./welcome.md')).toBe('welcome')
  })

  it('handles absolute path with extension', () => {
    expect(normalizeArg('/posts/welcome.md')).toBe('welcome')
  })

  it('leaves flags unchanged', () => {
    expect(normalizeArg('-l')).toBe('-l')
    expect(normalizeArg('--long')).toBe('--long')
    expect(normalizeArg('--sort=date')).toBe('--sort=date')
  })

  it('handles hyphenated slugs', () => {
    expect(normalizeArg('my-first-post')).toBe('my-first-post')
  })

  it('handles hyphenated slugs with ./ prefix', () => {
    expect(normalizeArg('./my-first-post')).toBe('my-first-post')
  })

  it('handles date-prefixed hyphenated slugs', () => {
    expect(normalizeArg('01-my-first-post')).toBe('my-first-post')
  })

  it('handles multi-digit date prefix', () => {
    expect(normalizeArg('23-some-post')).toBe('some-post')
  })
})

// ── preprocessArgs ───────────────────────────────────────────

describe('preprocessArgs', () => {
  it('normalizes all non-flag args', () => {
    expect(preprocessArgs(['./welcome', '-l'])).toEqual(['welcome', '-l'])
  })

  it('returns empty array for empty input', () => {
    expect(preprocessArgs([])).toEqual([])
  })

  it('normalizes mixed args', () => {
    expect(preprocessArgs(['./posts/01-foo.md', '--sort=date', 'bar'])).toEqual(
      ['foo', '--sort=date', 'bar'],
    )
  })
})
