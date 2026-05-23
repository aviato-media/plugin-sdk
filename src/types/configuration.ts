import { z } from 'zod'

import { FormFieldInputSchema } from './ui.js'

export const ConfigurationFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  input: FormFieldInputSchema.optional(),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  options: z.array(z.unknown()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  description: z.string().optional(),
})

export type ConfigurationField = z.infer<typeof ConfigurationFieldSchema>
