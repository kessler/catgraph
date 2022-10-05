import ForceGraph from 'force-graph'
import domReady from 'domready'

domReady(main)

async function main() {

  const host = global.document.location.host
  const ws = new WebSocket('ws://' + host)
  let mainGraph = undefined

  initWs()
  createGraph()

  function requestMore() {
    //setTimeout(() => send({ command: 'transmit' }), 1000)
    send({ command: 'transmit' })
  }

  function send(data) {
    console.log('sending', JSON.stringify(data))
    ws.send(JSON.stringify(data))
  }

  function updateGraph(newGraphData) {
    if (newGraphData.length === 0) return

    const { nodes, links } = mainGraph.graphData()

    const nodeIndex = new Set()
    const linkIndex = new Set()

    for (const node of nodes) {
      nodeIndex.add(node.id)
    }

    for (const { source, target } of links) {
      linkIndex.add(`${source.id}=>${target.id}`)
    }

    const newNodes = []
    const newLinks = []

    for (const { source, target } of newGraphData) {
      const sourceNode = tryJsonParse(source) || { id: source }

      if (!nodeIndex.has(sourceNode.id)) {
        newNodes.push(sourceNode)
        nodeIndex.add(sourceNode.id)
      }

      // for nodes that were defined as single when trasmitted to us
      if (target) {
        const targetNode = tryJsonParse(target) || { id: target }

        if (!nodeIndex.has(targetNode.id)) {
          newNodes.push(targetNode)
          nodeIndex.add(targetNode.id)
        }

        const linkId = `${sourceNode.id}=>${targetNode.id}`
        if (!linkIndex.has(linkId)) {
          newLinks.push({ source: sourceNode.id, target: targetNode.id })
        }
      }
    }

    const updateData = {
      nodes: [...nodes, ...newNodes],
      links: [...links, ...newLinks]
    }

    console.log(updateData)
    mainGraph.graphData(updateData)
  }

  function createGraph() {
    const data = {
      nodes: [],
      links: []
    }

    mainGraph = ForceGraph()
      (document.getElementById('graph'))
      //.cooldownTicks(100)
      //.linkDirectionalParticles(2)
      //.linkHoverPrecision(10)
      .linkDirectionalArrowLength(2)
      .graphData(data)
      .nodeAutoColorBy('val')

    //mainGraph.onEngineStop(() => requestMore())
  }

  function initWs() {
    ws.onopen = () => requestMore()
    ws.onclose = () => console.log('close')
    ws.onerror = err => console.error(err)

    ws.onmessage = message => {
      const { command, payload } = JSON.parse(message.data)

      if (command === 'updateGraph') {
        updateGraph(payload)
        requestMore()
      }
    }
  }
}

function tryJsonParse(data) {
  // don't return anything if these conditions are not met or we fail to parse
  try {
    const object = JSON.parse(data)

    if (typeof object === 'object' && object.id) {
      return object
    }
  } catch (e) {
    // dangerous
  }
}