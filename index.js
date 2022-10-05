const fs = require('fs/promises')
const path = require('path')
const hcat = require('hcat')
const WebSocket = require('ws')
const enableDestroy = require('server-destroy')
const LinkedList = require('digital-chain')
const debug = require('debug')('catgraph')
const json = require('./json')

module.exports = async () => {

  const config = {}

  // hcat option
  // we don't want the server to die right after first request
  // since we're serving websockets, so this is enforced
  config.serveOnce = false

  const state = {
    server: hcat(await createClientPage({}), config),
    websocketConnected: false,
    buffer: new LinkedList(),
    done: false
  }

  debug('initial state created')

  enableDestroy(state.server)
  state.wss = new WebSocket.Server({ server: state.server })
  state.wss.on('connection', onIncomingConnection)
  debug('wss created')

  return () => inputStream

  async function* inputStream(stream) {
    for await (const entry of stream) {
      state.buffer.push(entry)
    }

    maybeShutdown()
  }

  function onIncomingConnection(ws) {
    debug('incoming connection')

    if (state.websocketConnected) {
      return ws.close(-1, 'too many connections')
    }

    state.websocketConnected = true

    ws.on('error', err => {
      console.error('websocket error', err)
    })

    ws.on('close', () => {
      debug('closing connection')
      state.websocketConnected = false
    })

    ws.on('message', message => {
      const { command } = json.deserialize(message)
      
      debug('command message', command)

      if (command && command === 'transmit' && state.buffer.length > 0 && !state.done) {
        transmit(send)
      }
    })

    function send(data) {
      debug('sending data', data)
      ws.send(json.serialize(data))
    }
  }

  function transmit(send) {
    const transmitData = []

    while (state.buffer.length > 0 && transmitData.length < 1000) {
      const { source, target } = state.buffer.shift()
      transmitData.push({ source, target })
    }


    if (transmitData.length > 0) {
      send({ command: 'updateGraph', payload: transmitData })
    }

    maybeShutdown()
  }

  function maybeShutdown() {
    if (state.server && state.buffer.length === 0) {
      setTimeout(() => {
        console.log('shutting down server...')
        state.done = true
        state.wss.clients.forEach(ws => ws.terminate())
        state.wss.close()
        state.server.destroy()
      }, 2000)
    }
  }
}

async function createClientPage(clientContext) {

  const client = await fs.readFile(path.join(__dirname, 'dist', 'client.js'), 'utf8')
  const clientHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <style>
    body {
      margin: 0;
    }
    </style>
    <script>
    $$context = ${JSON.stringify(clientContext)}
    </script>
    <script>
    ${client}
    </script>
  </head>

  <body>
    <div id="graph"></div>
  </body>

  </html>
  `
  return clientHtml
}