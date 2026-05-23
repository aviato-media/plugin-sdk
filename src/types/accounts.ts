import { z } from 'zod'

import { ConfigurationFieldSchema } from './configuration.js'

export const AccountsBlockSchema = z.object({
  label: z.string().min(1),
  schema: z.array(ConfigurationFieldSchema).min(1),
}).superRefine((block, ctx) => {
  const nameField = block.schema.find(f => f.key === 'name')
  if (!nameField) {
    ctx.addIssue({
      code: 'custom',
      message: 'accounts.schema must include a "name" field',
    })
    return
  }
  if (nameField.input !== 'text') {
    ctx.addIssue({
      code: 'custom',
      message: 'accounts.schema "name" field must be input "text"',
    })
  }
})

export type AccountsBlock = z.infer<typeof AccountsBlockSchema>

/** Generic account record. T is the plugin's per-field shape. */
export type Account<T extends Record<string, unknown> = Record<string, unknown>> = T & {
  name: string
}
