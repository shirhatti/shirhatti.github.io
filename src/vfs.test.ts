import { describe, it, expect } from 'vitest'
import {
  resolve,
  stat,
  readdir,
  displayPath,
  findBySlug,
  allEntries,
  HOME,
} from './vfs'

// ── resolve ──────────────────────────────────────────────────

describe('resolve', () => {
  it('resolves ~ to HOME', () => {
    expect(resolve(HOME, '~')).toBe(HOME)
  })

  it('resolves ~/ paths', () => {
    expect(resolve(HOME, '~/posts')).toBe(HOME + '/posts')
  })

  it('resolves absolute paths', () => {
    expect(resolve(HOME, '/home/visitor/posts')).toBe('/home/visitor/posts')
  })

  it('resolves relative paths from cwd', () => {
    expect(resolve(HOME, 'posts')).toBe(HOME + '/posts')
  })

  it('resolves . as current directory', () => {
    expect(resolve(HOME + '/posts', '.')).toBe(HOME + '/posts')
  })

  it('resolves .. to parent directory', () => {
    expect(resolve(HOME + '/posts', '..')).toBe(HOME)
  })

  it('resolves multiple .. segments', () => {
    expect(resolve(HOME + '/posts/2016/04', '../..')).toBe(HOME + '/posts')
  })

  it('resolves mixed . and .. segments', () => {
    expect(resolve(HOME, './posts/../posts/./2016')).toBe(HOME + '/posts/2016')
  })

  it('does not go above root', () => {
    expect(resolve('/', '../../..')).toBe('/')
  })

  it('collapses redundant slashes', () => {
    expect(resolve(HOME, 'posts//2016///04')).toBe(HOME + '/posts/2016/04')
  })

  it('handles trailing slash', () => {
    expect(resolve(HOME, 'posts/')).toBe(HOME + '/posts')
  })
})

// ── displayPath ──────────────────────────────────────────────

describe('displayPath', () => {
  it('shows ~ for HOME', () => {
    expect(displayPath(HOME)).toBe('~')
  })

  it('shows ~/ prefix for paths under HOME', () => {
    expect(displayPath(HOME + '/posts')).toBe('~/posts')
  })

  it('shows absolute path for paths outside HOME', () => {
    expect(displayPath('/etc')).toBe('/etc')
  })

  it('shows / for root', () => {
    expect(displayPath('/')).toBe('/')
  })
})

// ── stat ─────────────────────────────────────────────────────

describe('stat', () => {
  it('returns root for /', () => {
    const node = stat('/')
    expect(node).not.toBeNull()
    expect(node!.type).toBe('dir')
  })

  it('returns HOME directory', () => {
    const node = stat(HOME)
    expect(node).not.toBeNull()
    expect(node!.type).toBe('dir')
  })

  it('returns posts directory', () => {
    const node = stat(HOME + '/posts')
    expect(node).not.toBeNull()
    expect(node!.type).toBe('dir')
  })

  it('returns null for non-existent path', () => {
    expect(stat(HOME + '/nonexistent')).toBeNull()
  })
})

// ── readdir ──────────────────────────────────────────────────

describe('readdir', () => {
  it('lists HOME directory', () => {
    const entries = readdir(HOME)
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.some((e) => e.name === 'posts')).toBe(true)
  })

  it('returns empty for non-existent path', () => {
    expect(readdir(HOME + '/nonexistent')).toEqual([])
  })

  it('returns empty for a file path', () => {
    // Find any file in the tree to test against
    const entries = allEntries()
    if (entries.length > 0) {
      const filePath = HOME + entries[0].path
      expect(readdir(filePath)).toEqual([])
    }
  })
})

// ── findBySlug ───────────────────────────────────────────────

describe('findBySlug', () => {
  it('finds the building-a-blog post', () => {
    const entry = findBySlug('building-a-blog')
    expect(entry).not.toBeUndefined()
    expect(entry!.slug).toBe('building-a-blog')
  })

  it('returns undefined for unknown slug', () => {
    expect(findBySlug('nonexistent-post')).toBeUndefined()
  })
})

// ── allEntries ───────────────────────────────────────────────

describe('allEntries', () => {
  it('returns at least one entry', () => {
    const entries = allEntries()
    expect(entries.length).toBeGreaterThan(0)
  })

  it('entries are sorted by date descending', () => {
    const entries = allEntries()
    for (let i = 1; i < entries.length; i++) {
      expect(
        new Date(entries[i - 1].meta.date).getTime(),
      ).toBeGreaterThanOrEqual(new Date(entries[i].meta.date).getTime())
    }
  })

  it('entries have required metadata', () => {
    const entries = allEntries()
    for (const entry of entries) {
      expect(entry.path).toBeTruthy()
      expect(entry.slug).toBeTruthy()
      expect(entry.meta.date).toBeTruthy()
    }
  })
})
