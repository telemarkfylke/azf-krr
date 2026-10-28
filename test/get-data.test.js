const { describe, it, after } = require('node:test')
const assert = require('node:assert/strict')
const { startServer } = require('./helpers')
const { getData } = require('../lib/get-data')

describe('getData', async () => {
  const server = await startServer(({ url }) => {
    if (url === '/fail') return { status: 500, body: { message: 'upstream down' } }
    return { body: { personer: [{ personidentifikator: '1' }] } }
  })
  after(() => server.close())

  it('posts payload with bearer token and json headers, and returns data', async () => {
    const data = await getData(`${server.url}/ok`, { personidentifikatorer: ['1'] }, 'tok')
    const request = server.requests.at(-1)

    assert.deepEqual(data, { personer: [{ personidentifikator: '1' }] })
    assert.equal(request.method, 'POST')
    assert.equal(request.headers.authorization, 'Bearer tok')
    assert.equal(request.headers.accept, 'application/json')
    assert.match(request.headers['content-type'], /application\/json/)
    assert.deepEqual(request.body, { personidentifikatorer: ['1'] })
  })

  it('uses the given method', async () => {
    await getData(`${server.url}/ok`, undefined, 'tok', 'get')
    assert.equal(server.requests.at(-1).method, 'GET')
  })

  it('rejects on error status and keeps the response data', async () => {
    await assert.rejects(
      () => getData(`${server.url}/fail`, {}, 'tok'),
      error => error.response.status === 500 && error.response.data.message === 'upstream down'
    )
  })
})
