const { logger } = require('@vtfk/logger')
const getMaskinportenToken = require('../lib/maskinporten-token')
const { getResponseObject } = require('../lib/get-response-object')
const { getData } = require('../lib/get-data')
const HTTPError = require('../lib/http-error')
const config = require('../config')

module.exports = async function (context, req) {
  try {
    const { body } = req
    if (!Array.isArray(body)) throw new HTTPError(400, 'Payload must be an array!')

    const token = await getMaskinportenToken()
    if (!token) throw new HTTPError(500, 'Unable to get token')

    const persons = await getData(config.krr.url, { personidentifikatorer: body }, token.access_token)
    logger('info', ['lookup', 'returning persons', persons.personer ? persons.personer.length : 0], context)

    return getResponseObject(persons)
  } catch (error) {
    logger('error', ['lookup', 'err', error.response?.data || error.message], context)

    if (error instanceof HTTPError) return error.toJSON()
    return new HTTPError(500, 'An unknown error occured', error.response?.data || error.stack || error.toString()).toJSON()
  }
}
