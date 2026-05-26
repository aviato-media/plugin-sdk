import { z } from 'zod'

/** Plugin runtime engine — how the host launches the plugin process. */
export const EngineSchema = z.enum(['bun', 'node', 'python', 'binary'])

export type Engine = z.infer<typeof EngineSchema>

/**
 * Outbound network policy declared by the plugin. Today only one field:
 * `bypassPrivacyProxy` opts the plugin out of the Aviato Privacy Proxy
 * when an admin has it enabled. Set this on plugins that *must* see the
 * real server WAN (e.g. a filesystem plugin reaching a private VPN-only
 * S3 endpoint). The optional `reason` is surfaced to admins so they
 * understand why the plugin opted out.
 */
export const NetworkPolicySchema = z.object({
  bypassPrivacyProxy: z.boolean().optional(),
  reason: z.string().optional(),
})

export type NetworkPolicy = z.infer<typeof NetworkPolicySchema>
