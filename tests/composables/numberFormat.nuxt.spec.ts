import { describe, it, expect } from 'vitest'

describe('Composable: numberFormat', () => {
  it('return 1k', () => {
    expect(numberFormat(1000, 1)).toEqual('1k')
  })
})
