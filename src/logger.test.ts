import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { createLogger, LOG_LEVELS } from './logger.js'

class CaptureStream {
  public chunks: string[] = []
  write (s: string): void {
    this.chunks.push(s)
  }
  records (): Record<string, unknown>[] {
    return this.chunks
      .join('')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as Record<string, unknown>)
  }
}

const originalEnv = { ...process.env }

beforeEach(() => {
  delete process.env.AVIATO_PLUGIN_ID
  delete process.env.AVIATO_PLUGIN_LOG_LEVEL
})

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('AVIATO_PLUGIN_')) {
      delete process.env[key]
    }
  }
  Object.assign(process.env, originalEnv)
})

describe('createLogger basics', () => {
  test('emits a pino-shaped JSON record per call', () => {
    const dest = new CaptureStream()
    const log = createLogger({ destination: dest })
    log.info('hello')
    const [rec] = dest.records()
    expect(rec.level).toBe(LOG_LEVELS.info)
    expect(rec.msg).toBe('hello')
    expect(typeof rec.time).toBe('number')
  })

  test('object-first signature includes payload alongside msg', () => {
    const dest = new CaptureStream()
    const log = createLogger({ destination: dest })
    log.warn({
      url: 'https://x',
      status: 500,
    }, 'request failed')
    const [rec] = dest.records()
    expect(rec.url).toBe('https://x')
    expect(rec.status).toBe(500)
    expect(rec.msg).toBe('request failed')
    expect(rec.level).toBe(LOG_LEVELS.warn)
  })

  test('object-only call (no msg) still emits payload', () => {
    const dest = new CaptureStream()
    const log = createLogger({
      destination: dest,
      level: 'debug',
    })
    log.debug({ event: 'tick' })
    const [rec] = dest.records()
    expect(rec.event).toBe('tick')
    expect(rec.msg).toBeUndefined()
  })
})

describe('level gating', () => {
  test('drops records below the configured level', () => {
    const dest = new CaptureStream()
    const log = createLogger({
      destination: dest,
      level: 'warn',
    })
    log.debug('skipped')
    log.info('also skipped')
    log.warn('kept')
    log.error('also kept')
    const levels = dest.records().map(r => r.level)
    expect(levels).toEqual([LOG_LEVELS.warn, LOG_LEVELS.error])
  })

  test('AVIATO_PLUGIN_LOG_LEVEL env var overrides the default', () => {
    process.env.AVIATO_PLUGIN_LOG_LEVEL = 'error'
    const dest = new CaptureStream()
    const log = createLogger({ destination: dest })
    log.info('skipped')
    log.error('kept')
    expect(dest.records().map(r => r.level)).toEqual([LOG_LEVELS.error])
    expect(log.level).toBe('error')
  })

  test('explicit option beats env var', () => {
    process.env.AVIATO_PLUGIN_LOG_LEVEL = 'error'
    const dest = new CaptureStream()
    const log = createLogger({
      destination: dest,
      level: 'debug',
    })
    log.debug('kept')
    expect(dest.records()).toHaveLength(1)
  })
})

describe('bindings', () => {
  test('AVIATO_PLUGIN_ID is added to every record', () => {
    process.env.AVIATO_PLUGIN_ID = 'my-plugin'
    const dest = new CaptureStream()
    const log = createLogger({ destination: dest })
    log.info('hi')
    expect(dest.records()[0].pluginId).toBe('my-plugin')
  })

  test('options.bindings merges over env bindings', () => {
    process.env.AVIATO_PLUGIN_ID = 'my-plugin'
    const dest = new CaptureStream()
    const log = createLogger({
      destination: dest,
      bindings: { region: 'us' },
    })
    log.info('hi')
    const [rec] = dest.records()
    expect(rec.pluginId).toBe('my-plugin')
    expect(rec.region).toBe('us')
  })

  test('child() returns a logger with merged bindings', () => {
    const dest = new CaptureStream()
    const log = createLogger({
      destination: dest,
      bindings: { region: 'us' },
    })
    const sub = log.child({ requestId: 'r-1' })
    sub.info('child-call')
    const [rec] = dest.records()
    expect(rec.region).toBe('us')
    expect(rec.requestId).toBe('r-1')
  })

  test('child child does not pollute parent', () => {
    const dest = new CaptureStream()
    const parent = createLogger({ destination: dest })
    const child = parent.child({ scope: 'inner' })
    parent.info('a')
    child.info('b')
    const recs = dest.records()
    expect(recs[0].scope).toBeUndefined()
    expect(recs[1].scope).toBe('inner')
  })
})

describe('error serialization', () => {
  test('payload.err Error is serialized to {name, message, stack}', () => {
    const dest = new CaptureStream()
    const log = createLogger({ destination: dest })
    const err = new TypeError('boom')
    log.error({ err }, 'oops')
    const [rec] = dest.records()
    const serialized = rec.err as { name: string,
      message: string,
      stack?: string }
    expect(serialized.name).toBe('TypeError')
    expect(serialized.message).toBe('boom')
    expect(typeof serialized.stack).toBe('string')
  })
})

describe('robustness', () => {
  test('circular reference does not throw and emits a fallback record', () => {
    const dest = new CaptureStream()
    const log = createLogger({ destination: dest })
    const circular: Record<string, unknown> = {}
    circular.self = circular
    log.info({ circular }, 'with cycle')
    const recs = dest.records()
    expect(recs).toHaveLength(1)
    expect(recs[0].msg).toBe('[log record failed to serialize]')
  })

  test('writes one line per call (trailing newline)', () => {
    const dest = new CaptureStream()
    const log = createLogger({ destination: dest })
    log.info('a')
    log.info('b')
    expect(dest.chunks).toHaveLength(2)
    expect(dest.chunks.every(c => c.endsWith('\n'))).toBe(true)
  })
})
