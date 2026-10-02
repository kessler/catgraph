import fs from 'node:fs/promises'
import path from 'node:path'
import hcat from 'hcat'
import { WebSocketServer } from 'ws'
import enableDestroy from 'server-destroy'
import LinkedList from 'digital-chain'
import createDebug from 'debug'
import * as json from './json.js'
import defaultConfig from './config.js'

const debug = createDebug('catgraph')
const BATCH_SIZE = 1000

// historySize: how many sent lines to keep for replaying to a reconnecting page (e.g. on refresh)
// nodeLabels: where node text is drawn, 'inside' or 'outside' the node
// disableNodeHover / disableEdgeHover: turn off the hover tooltips
export default async function catgraph({
  historySize = defaultConfig.historySize,
  nodeLabels = defaultConfig.nodeLabels,
  disableNodeHover = defaultConfig.disableNodeHover,
  disableEdgeHover = defaultConfig.disableEdgeHover
} = {}) {

  const config = {}

  // hcat option
  // we don't want the server to die right after first request
  // since we're serving websockets, so this is enforced
  config.serveOnce = false

  const state = {
    server: hcat(await createClientPage({ nodeLabels, disableNodeHover, disableEdgeHover }), config),
    websocketConnected: false,
    buffer: new LinkedList(),
    history: new LinkedList(),
    // a transmit request that arrived while the buffer was empty
    pendingSend: undefined,
    inputDone: false,
    shutdownScheduled: false,
    done: false
  }

  debug('initial state created')

  enableDestroy(state.server)
  state.wss = new WebSocketServer({ server: state.server })
  state.wss.on('connection', onIncomingConnection)
  debug('wss created')

  return () => inputStream

  async function* inputStream(stream) {
    for await (const entry of stream) {
      state.buffer.push(entry)

      if (state.pendingSend) {
        transmit(state.pendingSend)
      }
    }

    state.inputDone = true
    maybeShutdown()
  }

  function onIncomingConnection(ws) {
    debug('incoming connection')

    if (state.websocketConnected) {
      return ws.close(1013, 'too many connections')
    }

    state.websocketConnected = true

    // everything a previous page already received, sent before any new data
    const replay = Array.from(state.history.values())
    let replayIndex = 0

    ws.on('error', err => {
      console.error('websocket error', err)
    })

    ws.on('close', () => {
      debug('closing connection')
      state.websocketConnected = false
      state.pendingSend = undefined
    })

    ws.on('message', message => {
      const { command } = json.deserialize(message)

      debug('command message', command)

      if (command !== 'transmit' || state.done) return

      if (replayIndex < replay.length) {
        const payload = replay.slice(replayIndex, replayIndex + BATCH_SIZE)
        replayIndex += payload.length
        send({ command: 'updateGraph', payload })
        return
      }

      if (state.buffer.length === 0) {
        state.pendingSend = send
        return
      }

      transmit(send)
    })

    function send(data) {
      debug('sending data', data)
      ws.send(json.serialize(data))
    }
  }

  function transmit(send) {
    state.pendingSend = undefined
    const transmitData = []

    while (state.buffer.length > 0 && transmitData.length < BATCH_SIZE) {
      // label is undefined for unlabelled edges, which JSON leaves out of the payload
      const { source, target, label } = state.buffer.shift()
      transmitData.push({ source, target, label })
    }

    for (const entry of transmitData) {
      state.history.push(entry)
    }

    while (state.history.length > historySize) {
      state.history.shift()
    }

    if (transmitData.length > 0) {
      send({ command: 'updateGraph', payload: transmitData })
    }

    maybeShutdown()
  }

  function maybeShutdown() {
    if (state.inputDone && state.buffer.length === 0 && !state.shutdownScheduled) {
      state.shutdownScheduled = true
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

  const client = await fs.readFile(path.join(import.meta.dirname, 'dist', 'client.js'), 'utf8')
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