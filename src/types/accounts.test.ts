import { describe, expect, it } from 'bun:test'

import { AccountsBlockSchema } from './accounts.js'

describe('AccountsBlockSchema', () => {
  it('parses a minimal accounts block', () => {
    const parsed = AccountsBlockSchema.parse({
      label: 'AWS profile',
      schema: [
        {
          key: 'name',
          label: 'Profile name',
          input: 'text',
          required: true,
        },
        {
          key: 'accessKeyId',
          label: 'Access key ID',
          input: 'secret',
        },
      ],
    })
    expect(parsed.label).toBe('AWS profile')
    expect(parsed.schema).toHaveLength(2)
  })

  it('rejects a schema without a name field', () => {
    expect(() =>
      AccountsBlockSchema.parse({
        label: 'AWS profile',
        schema: [
          {
            key: 'accessKeyId',
            label: 'Access key ID',
            input: 'secret',
          },
        ],
      }),
    ).toThrow(/must include a .*name.* field/i)
  })

  it('rejects a name field that is not "text"', () => {
    expect(() =>
      AccountsBlockSchema.parse({
        label: 'X',
        schema: [
          {
            key: 'name',
            label: 'N',
            input: 'toggle',
          },
        ],
      }),
    ).toThrow(/name.*must be input/i)
  })
})
