import { z } from 'zod'

// ── Slot IDs ────────────────────────────────────────────

export const SlotIdSchema = z.enum([
  'sidebar-discover',
  'sidebar-bottom',
  'header-actions',
  'hero-banner',
  'home-sections',
  'detail-actions',
  'detail-metadata',
  'detail-sections',
  'player-overlay',
  'settings-panes',
  'command-palette',
  'routes',
])
export type SlotId = z.infer<typeof SlotIdSchema>

// ── Form Fields ─────────────────────────────────────────

export const FormFieldInputSchema = z.enum([
  'text', 'number', 'toggle', 'select', 'multi-select',
  'string-list', 'file-path', 'color', 'slider',
])
export type FormFieldInput = z.infer<typeof FormFieldInputSchema>

export const FormFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  input: FormFieldInputSchema,
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  options: z.array(z.unknown()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  description: z.string().optional(),
})
export type FormField = z.infer<typeof FormFieldSchema>

// ── Metadata Fields ─────────────────────────────────────

export const MetadataLayoutSchema = z.enum(['key-value', 'list', 'chips', 'gallery'])
export type MetadataLayout = z.infer<typeof MetadataLayoutSchema>

export const MetadataFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  layout: MetadataLayoutSchema.optional(),
  limit: z.number().optional(),
})
export type MetadataField = z.infer<typeof MetadataFieldSchema>

// ── UI Schema Types ─────────────────────────────────────

export const UIFormSchemaSchema = z.object({
  slot: SlotIdSchema,
  id: z.string(),
  title: z.string(),
  icon: z.string().optional(),
  type: z.literal('form'),
  fields: z.array(FormFieldSchema),
})
export type UIFormSchema = z.infer<typeof UIFormSchemaSchema>

export const UIMetadataSchemaSchema = z.object({
  slot: SlotIdSchema,
  id: z.string(),
  title: z.string(),
  type: z.literal('metadata'),
  layout: MetadataLayoutSchema,
  fields: z.array(MetadataFieldSchema),
})
export type UIMetadataSchema = z.infer<typeof UIMetadataSchemaSchema>

export const UIActionSchemaSchema = z.object({
  slot: SlotIdSchema,
  id: z.string(),
  type: z.literal('action'),
  label: z.string(),
  icon: z.string().optional(),
  confirm: z.string().optional(),
  rpcMethod: z.string(),
})
export type UIActionSchema = z.infer<typeof UIActionSchemaSchema>

export const UISchemaSchema = z.discriminatedUnion('type', [
  UIFormSchemaSchema,
  UIMetadataSchemaSchema,
  UIActionSchemaSchema,
])
export type UISchema = z.infer<typeof UISchemaSchema>
