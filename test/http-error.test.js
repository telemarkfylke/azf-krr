const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const HTTPError = require('../lib/http-error')

describe('HTTPError', () => {
  it('is an Error with statusCode', () => {
    const error = new HTTPError(400, 'nope')
    assert.ok(error instanceof Error)
    assert.equal(error.statusCode, 400)
    assert.equal(error.message, 'nope')
  })

  it('falls back to the standard status text as message', () => {
    assert.equal(new HTTPError(404).message, 'Not Found')
  })

  it('derives name from status code', () => {
    assert.equal(new HTTPError(400).name, 'BadRequestError')
    assert.equal(new HTTPError(404).name, 'NotFoundError')
    assert.equal(new HTTPError(500).name, 'InternalServerError')
    assert.equal(new HTTPError(302).name, 'Found')
  })

  it('serializes to a function response object', () => {
    const json = new HTTPError(400, 'bad', { detail: 'x' }).toJSON()
    assert.deepEqual(json, {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: { error: { statusCode: 400, message: 'bad', innerError: { detail: 'x' } } }
    })
  })

  it('leaves innerError undefined when not given', () => {
    assert.equal(new HTTPError(500, 'x').toJSON().body.error.innerError, undefined)
  })

  // Known bug: toName does STATUS_CODES[code].replace(...) which throws for codes Node does not know
  it('does not throw for unknown status codes', { todo: 'toName throws TypeError for codes missing from http.STATUS_CODES' }, () => {
    assert.doesNotThrow(() => new HTTPError(499, 'custom'))
  })
})
