const { describe, it, beforeEach, afterEach, after } = require('node:test')
const assert = require('node:assert/strict')
const { stubModule, restoreStubs, clearProjectModules, setEnv, startServer } = require('./helpers')

describe('Lookup', async () => {
  const krr = await startServer(() => krrResponse())
  let krrResponse
  let tokenResult
  let logs
  let restoreEnv
  let lookup

  const context = {}
  const personer = [{ personidentifikator: '12345678910', reservasjon: 'NEI', status: 'AKTIV' }]

  beforeEach(() => {
    krr.requests.length = 0
    krrResponse = () => ({ body: { personer } })
    tokenResult = { access_token: 'krr-token', expires_in: 120 }
    logs = []
    restoreEnv = setEnv({ KRR_URL: `${krr.url}/rest/v1/personer` })
    stubModule('@vtfk/logger', { logger: (...args) => logs.push(args) })
    stubModule('../lib/maskinporten-token', async () => tokenResult)
    clearProjectModules()
    // clearProjectModules drops the stub of our own module, so put it back before loading Lookup
    stubModule('../lib/maskinporten-token', async () => tokenResult)
    lookup = require('../Lookup')
  })

  afterEach(() => {
    restoreEnv()
    restoreStubs()
    clearProjectModules()
  })

  after(() => krr.close())

  it('returns 400 when body is not an array', async () => {
    const response = await lookup(context, { body: { not: 'an array' } })
    assert.equal(response.status, 400)
    assert.equal(response.body.error.message, 'Payload must be an array!')
    assert.equal(krr.requests.length, 0)
  })

  it('returns 400 when there is no body (GET)', async () => {
    const response = await lookup(context, {})
    assert.equal(response.status, 400)
  })

  it('returns persons from KRR and sends ids and token upstream', async () => {
    const response = await lookup(context, { body: ['12345678910'] })

    assert.equal(response.status, 200)
    assert.deepEqual(response.body, { personer })
    assert.equal(krr.requests.length, 1)
    assert.equal(krr.requests[0].url, '/rest/v1/personer')
    assert.equal(krr.requests[0].headers.authorization, 'Bearer krr-token')
    assert.deepEqual(krr.requests[0].body, { personidentifikatorer: ['12345678910'] })
  })

  it('accepts an empty array', async () => {
    krrResponse = () => ({ body: { personer: [] } })
    const response = await lookup(context, { body: [] })
    assert.equal(response.status, 200)
    assert.deepEqual(response.body, { personer: [] })
  })

  it('returns 500 when no token is available', async () => {
    tokenResult = undefined
    const response = await lookup(context, { body: ['12345678910'] })
    assert.equal(response.status, 500)
    assert.equal(response.body.error.message, 'Unable to get token')
  })

  it('returns 500 with upstream data as innerError when KRR fails', async () => {
    krrResponse = () => ({ status: 503, body: { feil: 'utilgjengelig' } })
    const response = await lookup(context, { body: ['12345678910'] })
    assert.equal(response.status, 500)
    assert.equal(response.body.error.message, 'An unknown error occured')
    assert.deepEqual(response.body.error.innerError, { feil: 'utilgjengelig' })
  })

  it('does not write personal ids to the log', async () => {
    await lookup(context, { body: ['12345678910'] })
    assert.ok(logs.length > 0)
    assert.ok(!JSON.stringify(logs).includes('12345678910'))
  })
})
