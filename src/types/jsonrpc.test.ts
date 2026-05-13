import { describe, expect, test } from 'bun:test'

import {
  JSON_RPC_ERRORS,
  JsonRpcErrorResponseSchema,
  JsonRpcNotificationSchema,
  JsonRpcRequestSchema,
  JsonRpcResponseSchema,
} from './jsonrpc.js'

describe('JsonRpcRequestSchema', () => {
  test('accepts a valid request with id', () => {
    expect(JsonRpcRequestSchema.safeParse({
      jsonrpc: '2.0',
      id: 1,
      method: 'ping',
    }).success).toBe(true)
  })

  test('accepts a valid request with string id and params', () => {
    expect(JsonRpcRequestSchema.safeParse({
      jsonrpc: '2.0',
      id: 'abc',
      method: 'foo',
      params: {
        x: 1,
      },
    }).success).toBe(true)
  })

  test('rejects wrong jsonrpc version', () => {
    expect(JsonRpcRequestSchema.safeParse({
      jsonrpc: '1.0',
      method: 'ping',
    }).success).toBe(false)
  })

  test('rejects missing method', () => {
    expect(JsonRpcRequestSchema.safeParse({
      jsonrpc: '2.0',
    }).success).toBe(false)
  })
})

describe('JsonRpcResponseSchema', () => {
  test('accepts response with result', () => {
    expect(JsonRpcResponseSchema.safeParse({
      jsonrpc: '2.0',
      id: 1,
      result: {
        ok: true,
      },
    }).success).toBe(true)
  })

  test('rejects missing id', () => {
    expect(JsonRpcResponseSchema.safeParse({
      jsonrpc: '2.0',
      result: null,
    }).success).toBe(false)
  })
})

describe('JsonRpcErrorResponseSchema', () => {
  test('accepts error response with null id', () => {
    expect(JsonRpcErrorResponseSchema.safeParse({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32600,
        message: 'Invalid Request',
      },
    }).success).toBe(true)
  })

  test('accepts error with data', () => {
    expect(JsonRpcErrorResponseSchema.safeParse({
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -1,
        message: 'oops',
        data: {
          stack: 'trace',
        },
      },
    }).success).toBe(true)
  })

  test('rejects when error is missing', () => {
    expect(JsonRpcErrorResponseSchema.safeParse({
      jsonrpc: '2.0',
      id: 1,
    }).success).toBe(false)
  })
})

describe('JsonRpcNotificationSchema', () => {
  test('accepts notification without id', () => {
    expect(JsonRpcNotificationSchema.safeParse({
      jsonrpc: '2.0',
      method: 'process.started',
      params: {
        pid: 1,
      },
    }).success).toBe(true)
  })
})

describe('JSON_RPC_ERRORS', () => {
  test('exposes canonical error codes', () => {
    expect(JSON_RPC_ERRORS.PARSE_ERROR).toBe(-32700)
    expect(JSON_RPC_ERRORS.INVALID_REQUEST).toBe(-32600)
    expect(JSON_RPC_ERRORS.METHOD_NOT_FOUND).toBe(-32601)
    expect(JSON_RPC_ERRORS.INVALID_PARAMS).toBe(-32602)
    expect(JSON_RPC_ERRORS.INTERNAL_ERROR).toBe(-32603)
  })
})
