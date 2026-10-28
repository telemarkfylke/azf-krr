const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const { stubModule, restoreStubs, clearProjectModules, setEnv } = require('./helpers')

describe('maskinporten-token', () => {
  let calls
  let restoreEnv
  let getToken

  beforeEach(() => {
    calls = []
    restoreEnv = setEnv({
      NODE_ENV: 'prod',
      CERTIFICATE_PFX_BASE64: 'pfx-base64',
      CERTIFICATE_PASSPHRASE: 'pass',
      MASKINPORTEN_SCOPE: 'the-scope',
      MASKINPORTEN_AUDIENCE: 'the-audience',
      MASKINPORTEN_ISSUER: 'the-issuer',
      MASKINPORTEN_TOKEN_URL: 'https://token.example'
    })
    stubModule('@vtfk/logger', { logger: () => {} })
    stubModule('@vtfk/maskinporten-auth', async (options) => {
      calls.push(options)
      return { access_token: `token-${calls.length}`, expires_in: 120 }
    })
    clearProjectModules()
    getToken = require('../lib/maskinporten-token')
  })

  afterEach(() => {
    restoreEnv()
    restoreStubs()
    clearProjectModules()
  })

  it('fetches a token using values from config', async () => {
    const token = await getToken()
    assert.equal(token.access_token, 'token-1')
    assert.deepEqual(calls[0], {
      url: 'https://token.example',
      pfxcert: 'pfx-base64',
      privateKeyPassphrase: 'pass',
      audience: 'the-audience',
      issuer: 'the-issuer',
      scope: 'the-scope'
    })
  })

  it('returns the cached token on the second call', async () => {
    const first = await getToken()
    const second = await getToken()
    assert.equal(calls.length, 1)
    assert.equal(second.access_token, first.access_token)
  })

  it('fetches a new token when forceNew is true', async () => {
    await getToken()
    const fresh = await getToken(true)
    assert.equal(calls.length, 2)
    assert.equal(fresh.access_token, 'token-2')
  })

  it('propagates errors from maskinporten', async () => {
    stubModule('@vtfk/maskinporten-auth', async () => { throw new Error('maskinporten down') })
    clearProjectModules()
    const failing = require('../lib/maskinporten-token')
    await assert.rejects(() => failing(), /maskinporten down/)
  })
})
