const http = require('http')
const path = require('path')

const root = path.resolve(__dirname, '..')
const originals = new Map()

// Replaces a dependency in the require cache. Undo with restoreStubs()
const stubModule = (name, exports) => {
  const id = require.resolve(name)
  if (!originals.has(id)) originals.set(id, require.cache[id])
  require.cache[id] = { id, filename: id, loaded: true, exports }
}

const restoreStubs = () => {
  for (const [id, original] of originals) {
    if (original) require.cache[id] = original
    else delete require.cache[id]
  }
  originals.clear()
}

// Drops project modules from the require cache so config and module-level state (token cache) is re-evaluated
const clearProjectModules = () => {
  Object.keys(require.cache)
    .filter(id => id.startsWith(root) && !id.includes('node_modules') && !id.startsWith(__dirname))
    .forEach(id => delete require.cache[id])
}

// Sets env vars and returns a function that restores the previous values
const setEnv = (vars) => {
  const previous = Object.fromEntries(Object.keys(vars).map(key => [key, process.env[key]]))
  Object.entries(vars).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  })
  return () => setEnv(previous)
}

// Local http server that records requests and answers with the given handler result
const startServer = async (respond) => {
  const requests = []
  const server = http.createServer((req, res) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString()
      requests.push({ method: req.method, url: req.url, headers: req.headers, body: raw ? JSON.parse(raw) : undefined })
      const { status = 200, body = {} } = respond(requests[requests.length - 1])
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(body))
    })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    requests,
    close: () => new Promise(resolve => server.close(resolve))
  }
}

module.exports = { stubModule, restoreStubs, clearProjectModules, setEnv, startServer }
