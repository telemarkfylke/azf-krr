const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { getResponseObject } = require('../lib/get-response-object')

describe('getResponseObject', () => {
  it('defaults to status 200', () => {
    assert.equal(getResponseObject({ a: 1 }).status, 200)
  })

  it('uses the given status', () => {
    assert.equal(getResponseObject({}, 404).status, 404)
  })

  it('sets json content type', () => {
    assert.deepEqual(getResponseObject({}).headers, { 'Content-Type': 'application/json' })
  })

  it('passes data through as body', () => {
    const data = { personer: [] }
    assert.equal(getResponseObject(data).body, data)
  })
})
