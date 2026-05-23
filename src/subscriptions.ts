import type { PluginClient } from './client.js'
import type { HostApi } from './host/index.js'

type EventHandler = (payload: Record<string, unknown>) => void | Promise<void>
type HookHandler = (payload: Record<string, unknown>) => Promise<Record<string, unknown> | null>
type ViewHandler = (context: Record<string, unknown>) => Promise<unknown>

/** Match a dot-separated pattern with single-segment wildcards against a name */
export function matchPattern (pattern: string, name: string): boolean {
  const pp = pattern.split('.')
  const np = name.split('.')
  if (pp.length !== np.length) {
    return false
  }
  return pp.every((seg, i) => seg === '*' || seg === np[i])
}

function findHandler<T> (handlers: Map<string, T>, name: string): T | undefined {
  const exact = handlers.get(name)
  if (exact) {
    return exact
  }

  for (const [pattern, handler] of handlers) {
    if (pattern.includes('*') && matchPattern(pattern, name)) {
      return handler
    }
  }
  return undefined
}

export interface PluginEventEmitter {
  on (name: string, handler: EventHandler): void
}

export interface PluginHookEmitter {
  on (name: string, handler: HookHandler): void
}

export interface PluginViewEmitter {
  on (name: string, handler: ViewHandler): void
}

export interface PluginInstance {
  client: PluginClient
  events: PluginEventEmitter
  hooks: PluginHookEmitter
  views: PluginViewEmitter
  /** Typed, contract-checked API for calling the host (e.g. `host.accounts.get(name)`). */
  host: HostApi
}

export function createSubscriptionBuilders (client: PluginClient): {
  events: PluginEventEmitter
  hooks: PluginHookEmitter
  views: PluginViewEmitter
} {
  const eventHandlers = new Map<string, EventHandler>()
  const hookHandlers = new Map<string, HookHandler>()
  const viewHandlers = new Map<string, ViewHandler>()

  let eventMethodRegistered = false
  let hookMethodRegistered = false
  let viewMethodRegistered = false

  const events: PluginEventEmitter = {
    on (name: string, handler: EventHandler): void {
      eventHandlers.set(name, handler)

      if (!eventMethodRegistered) {
        eventMethodRegistered = true
        client.registerMethod('event.dispatch', async (params) => {
          const eventName = params.name as string
          const payload = (params.payload ?? {}) as Record<string, unknown>
          const h = findHandler(eventHandlers, eventName)
          if (h) {
            try {
              await h(payload)
            } catch (err) {
              process.stderr.write(`Event handler error for ${eventName}: ${err}\n`)
            }
          }
          return {
            ok: true,
          }
        })
      }
    },
  }

  const hooks: PluginHookEmitter = {
    on (name: string, handler: HookHandler): void {
      hookHandlers.set(name, handler)

      if (!hookMethodRegistered) {
        hookMethodRegistered = true
        client.registerMethod('hook.dispatch', async (params) => {
          const hookName = params.name as string
          const payload = (params.payload ?? {}) as Record<string, unknown>
          const h = findHandler(hookHandlers, hookName)
          if (!h) {
            return {
              data: null,
            }
          }
          const result = await h(payload)
          return {
            data: result,
          }
        })
      }
    },
  }

  const views: PluginViewEmitter = {
    on (name: string, handler: ViewHandler): void {
      viewHandlers.set(name, handler)

      if (!viewMethodRegistered) {
        viewMethodRegistered = true
        client.registerMethod('view.dispatch', async (params) => {
          const viewName = params.name as string
          const context = (params.context ?? {}) as Record<string, unknown>
          const h = findHandler(viewHandlers, viewName)
          if (!h) {
            return {
              result: null,
            }
          }
          const result = await h(context)
          return {
            result,
          }
        })
      }
    },
  }

  return {
    events,
    hooks,
    views,
  }
}
