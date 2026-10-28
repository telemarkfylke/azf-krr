const { describe, it, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const { setEnv, clearProjectModules } = require('./helpers')

const ENV_KEYS = ['KRR_URL', 'NODE_ENV', 'CERTIFICATE_PFX_PATH', 'CERTIFICATE_PASSPHRASE', 'CERTIFICATE_PFX_BASE64',
  'MASKINPORTEN_SCOPE', 'MASKINPORTEN_AUDIENCE', 'MASKINPORTEN_ISSUER', 'MASKINPORTEN_TOKEN_URL']
const cleared = Object.fromEntries(ENV_KEYS.map(key => [key, undefined]))

const loadConfig = (env) => {
  const restore = setEnv({ ...cleared, ...env })
  clearProjectModules()
  const config = require('../config')
  restore()
  return config
}

describe('config', () => {
  afterEach(clearProjectModules)

  it('has defaults when env is empty', () => {
    const config = loadConfig({})
    assert.equal(config.krr.url, 'https://krr.digdir.no/rest/v1/personer')
    assert.equal(config.env, 'dev')
    assert.equal(config.certificate.passphrase, null)
  })

  it('reads values from env', () => {
    const config = loadConfig({
      KRR_URL: 'https://test.example/krr',
      NODE_ENV: 'prod',
      CERTIFICATE_PASSPHRASE: 'secret',
      CERTIFICATE_PFX_BASE64: 'abc',
      MASKINPORTEN_SCOPE: 'scope',
      MASKINPORTEN_AUDIENCE: 'aud',
      MASKINPORTEN_ISSUER: 'iss',
      MASKINPORTEN_TOKEN_URL: 'https://token.example'
    })
    assert.equal(config.krr.url, 'https://test.example/krr')
    assert.equal(config.env, 'prod')
    assert.equal(config.certificate.passphrase, 'secret')
    assert.equal(config.certificate.pfxBase64, 'abc')
    assert.deepEqual(config.maskinporten, { scope: 'scope', audience: 'aud', issuer: 'iss', tokenUrl: 'https://token.example' })
  })
})
