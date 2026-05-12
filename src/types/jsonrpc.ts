import { z } from 'zod'

export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
})

export const JsonRpcResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.unknown(),
})

export const JsonRpcErrorResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }),
})

export const JsonRpcNotificationSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
})

export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>
export type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>
export type JsonRpcErrorResponse = z.infer<typeof JsonRpcErrorResponseSchema>
export type JsonRpcNotification = z.infer<typeof JsonRpcNotificationSchema>
export type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcErrorResponse | JsonRpcNotification

export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const
