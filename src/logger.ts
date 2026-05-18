// Structured logging for plugins. Emits one JSON record per line to
// stderr, where the Aviato host captures each line, detects the
// pino-compatible shape, and forwards the record into the per-plugin
// rotating log file at the matching level. Plugins that prefer to use
// `console.log` / `process.stderr.write` directly still work — the host
// falls back to treating non-JSON lines as `info` text.
//
// The SDK logger deliberately avoids `pino` as a dependency: plugins
// already pay the SDK's bundle cost and pino's transport workers don't
// behave well inside short-lived plugin processes. Synchronous JSON
// writes to stderr are simple, predictable, and small.

/** Numeric severities matching pino so the host can route each level
 * into the right pino call without an explicit mapping table. */
export const LOG_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
} as const

export type LogLevel = keyof typeof LOG_LEVELS

export interface LogFn {
  (msg: string): void
  (obj: Record<string, unknown>, msg?: string): void
}

export interface Logger {
  /** Resolved minimum level for this logger. */
  readonly level: LogLevel
  readonly trace: LogFn
  readonly debug: LogFn
  readonly info: LogFn
  readonly warn: LogFn
  readonly error: LogFn
  readonly fatal: LogFn
  /** Returns a new logger that adds the given fields to every record. */
  readonly child: (bindings: Record<string, unknown>) => Logger
}

export interface LoggerOptions {
  /** Minimum severity to emit. Defaults to `AVIATO_PLUGIN_LOG_LEVEL` env
   * or `'info'`. Records below this level are dropped at the call site. */
  level?: LogLevel
  /** Fields included on every record. Merged on top of the default
   * `{ pluginId }` (sourced from `AVIATO_PLUGIN_ID`). */
  bindings?: Record<string, unknown>
  /** Destination for the JSON line writes. Defaults to `process.stderr`
   * because the Aviato host captures plugin stderr to route into the
   * per-plugin log file. Tests can pass a buffer-like object here. */
  destination?: { write: (chunk: string) => unknown }
}

interface SerializedError {
  name: string
  message: string
  stack?: string
}

function serializeError (err: Error): SerializedError {
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  }
}

function envLevel (): LogLevel | undefined {
  const v = process.env.AVIATO_PLUGIN_LOG_LEVEL
  if (v && v in LOG_LEVELS) {
    return v as LogLevel
  }
  return undefined
}

function defaultBindings (): Record<string, unknown> {
  const id = process.env.AVIATO_PLUGIN_ID
  return id ? { pluginId: id } : {}
}

function buildRecord (
  levelName: LogLevel,
  bindings: Record<string, unknown>,
  args: readonly unknown[],
): Record<string, unknown> {
  let payload: Record<string, unknown> = {}
  let msg: string | undefined

  if (args.length > 0) {
    const first = args[0]
    if (typeof first === 'string') {
      msg = first
    } else if (first && typeof first === 'object') {
      payload = first as Record<string, unknown>
      if (typeof args[1] === 'string') {
        msg = args[1] as string
      }
    }
  }

  const record: Record<string, unknown> = {
    level: LOG_LEVELS[levelName],
    time: Date.now(),
    ...bindings,
  }

  for (const [k, v] of Object.entries(payload)) {
    record[k] = v instanceof Error ? serializeError(v) : v
  }

  if (msg !== undefined) {
    record.msg = msg
  }

  return record
}

/** Build a logger. Most plugins can call this with no arguments and rely
 * on the env-driven defaults:
 *
 * ```ts
 * import { createLogger } from '@aviato-media/plugin-sdk'
 *
 * const log = createLogger()
 * log.info('starting up')
 * log.error({ err, url }, 'fetch failed')
 * const sub = log.child({ requestId: '...' })
 * sub.debug('handling request')
 * ```
 */
export function createLogger (options: LoggerOptions = {}): Logger {
  const resolvedLevel: LogLevel = options.level ?? envLevel() ?? 'info'
  const minLevel = LOG_LEVELS[resolvedLevel]
  const bindings = {
    ...defaultBindings(),
    ...options.bindings ?? {},
  }
  const destination = options.destination ?? {
    write: (chunk: string) => process.stderr.write(chunk),
  }

  function emit (levelName: LogLevel, args: readonly unknown[]): void {
    if (LOG_LEVELS[levelName] < minLevel) {
      return
    }
    const record = buildRecord(levelName, bindings, args)
    let serialized: string
    try {
      serialized = JSON.stringify(record)
    } catch {
      // Swallow circular-reference and other serialization errors so the
      // logger never crashes the plugin process. Emit a minimal stand-in.
      serialized = JSON.stringify({
        level: LOG_LEVELS[levelName],
        time: Date.now(),
        ...bindings,
        msg: '[log record failed to serialize]',
      })
    }
    destination.write(`${serialized}\n`)
  }

  const makeFn = (levelName: LogLevel): LogFn => (
    (...args: unknown[]) => {
      emit(levelName, args)
    }
  ) as LogFn

  return {
    level: resolvedLevel,
    trace: makeFn('trace'),
    debug: makeFn('debug'),
    info: makeFn('info'),
    warn: makeFn('warn'),
    error: makeFn('error'),
    fatal: makeFn('fatal'),
    child (newBindings: Record<string, unknown>): Logger {
      return createLogger({
        level: resolvedLevel,
        bindings: {
          ...bindings,
          ...newBindings,
        },
        destination,
      })
    },
  }
}
