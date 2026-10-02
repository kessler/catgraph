import ForceGraph from 'force-graph'
import { forceCollide } from 'd3-force-3d'
import domReady from 'domready'

// font sizes are in graph units, so text scales with zoom like the nodes do
const NODE_LABEL_FONT_SIZE = 4
const EDGE_LABEL_FONT_SIZE = 3
const ELLIPSIS = '…'
const REFERENCE_FONT_SIZE = 10
// share of the node radius that text inside the node may use
const NODE_TEXT_FILL = 0.75
// text smaller than this on screen is not drawn, hover still shows it
const MIN_READABLE_PX = 5
const PARALLEL_CURVATURE_STEP = 0.3
const SELF_LOOP_CURVATURE_STEP = 0.3
// minimum gap kept around each node, in graph units
const COLLIDE_PADDING = 1

domReady(main)

async function main() {

  const { nodeLabels, disableNodeHover, disableEdgeHover } = global.$$context
  const host = global.document.location.host
  const ws = new WebSocket('ws://' + host)
  // links between the same two nodes, in either direction, keyed by the unordered pair
  const linksByPair = new Map()
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

    for (const { source, target, label } of links) {
      linkIndex.add(linkKey(endId(source), endId(target), label))
    }

    const newNodes = []
    const newLinks = []

    for (const { source, target, label } of newGraphData) {
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

        const linkId = linkKey(sourceNode.id, targetNode.id, label)
        if (!linkIndex.has(linkId)) {
          const link = { source: sourceNode.id, target: targetNode.id, label }
          newLinks.push(link)
          linkIndex.add(linkId)
          addToPair(link)
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

  // spread the links of a pair so parallel and opposite links don't overlap
  function addToPair(link) {
    const sourceKey = JSON.stringify(link.source)
    const targetKey = JSON.stringify(link.target)
    const [firstKey, secondKey] = [sourceKey, targetKey].sort()
    const pairKey = `${firstKey},${secondKey}`

    const pairLinks = linksByPair.get(pairKey) ?? []
    pairLinks.push(link)
    linksByPair.set(pairKey, pairLinks)

    if (sourceKey === targetKey) {
      pairLinks.forEach((pairLink, i) => {
        pairLink.curvature = (i + 1) * SELF_LOOP_CURVATURE_STEP
      })
      return
    }

    pairLinks.forEach((pairLink, i) => {
      const curvature = (i - (pairLinks.length - 1) / 2) * PARALLEL_CURVATURE_STEP
      // curvature bends relative to the link's own direction, so links going the other way are flipped
      pairLink.curvature = JSON.stringify(endId(pairLink.source)) === firstKey ? curvature : -curvature
    })
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
      .nodeLabel(disableNodeHover ? () => null : node => textElement(nodeText(node)))
      .nodeCanvasObjectMode(() => 'after')
      .nodeCanvasObject(nodeLabels === 'outside' ? drawNodeTextOutside : drawNodeTextInside)
      .linkCurvature('curvature')
      .linkLabel(disableEdgeHover ? () => null : link => link.label === undefined ? null : textElement(link.label))
      .linkCanvasObjectMode(() => 'after')
      .linkCanvasObject((link, ctx, globalScale) => drawLinkLabel(link, ctx, globalScale, mainGraph.nodeRelSize()))
      // keep nodes from overlapping
      .d3Force('collide', forceCollide(node => nodeRadius(node, mainGraph.nodeRelSize()) + COLLIDE_PADDING))
      .width(window.innerWidth)
      .height(window.innerHeight)

    // force-graph takes the window size once, when it loads, which is 0x0 if the page loaded before its window had a size
    window.addEventListener('resize', () => mainGraph.width(window.innerWidth).height(window.innerHeight))

    //mainGraph.onEngineStop(() => requestMore())
  }

  // largest text that fits inside the circle: the text box half diagonal must not exceed the padded radius
  function drawNodeTextInside(node, ctx, globalScale) {
    const text = nodeText(node)

    ctx.save()
    ctx.font = `${REFERENCE_FONT_SIZE}px Sans-Serif`
    const widthPerFontPx = ctx.measureText(text).width / REFERENCE_FONT_SIZE
    const fontSize = 2 * nodeRadius(node, mainGraph.nodeRelSize()) * NODE_TEXT_FILL / Math.sqrt(widthPerFontPx ** 2 + 1)

    if (fontSize * globalScale >= MIN_READABLE_PX) {
      ctx.font = `${fontSize}px Sans-Serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = textColorFor(node.color)
      ctx.fillText(text, node.x, node.y)
    }

    ctx.restore()
  }

  function drawNodeTextOutside(node, ctx, globalScale) {
    if (NODE_LABEL_FONT_SIZE * globalScale < MIN_READABLE_PX) return

    ctx.save()
    ctx.font = `${NODE_LABEL_FONT_SIZE}px Sans-Serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#333'
    ctx.fillText(nodeText(node), node.x, node.y + nodeRadius(node, mainGraph.nodeRelSize()) + 1)
    ctx.restore()
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

function drawLinkLabel(link, ctx, globalScale, nodeRelSize) {
  if (link.label === undefined || EDGE_LABEL_FONT_SIZE * globalScale < MIN_READABLE_PX) return

  const { source, target } = link
  // force-graph computes __controlPoints for curved links before custom link objects are drawn
  const { x, y } = curveMidpoint(source, target, link.__controlPoints)

  // keep the text upright
  let angle = source === target ? 0 : Math.atan2(target.y - source.y, target.x - source.x)
  if (angle > Math.PI / 2) angle -= Math.PI
  if (angle < -Math.PI / 2) angle += Math.PI

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.font = `${EDGE_LABEL_FONT_SIZE}px Sans-Serif`
  const padding = EDGE_LABEL_FONT_SIZE * 0.2
  const text = fitText(ctx, link.label, labelSpace(source, target, nodeRelSize) - padding * 2)

  if (text.length > 0) {
    const width = ctx.measureText(text).width
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fillRect(-width / 2 - padding, -EDGE_LABEL_FONT_SIZE / 2 - padding, width + padding * 2, EDGE_LABEL_FONT_SIZE + padding * 2)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#555'
    ctx.fillText(text, 0, 0)
  }

  ctx.restore()
}

// room along the edge between the two node borders, self loops are not limited
function labelSpace(source, target, nodeRelSize) {
  if (source === target) return Infinity

  const length = Math.hypot(target.x - source.x, target.y - source.y)
  return length - nodeRadius(source, nodeRelSize) - nodeRadius(target, nodeRelSize)
}

// the text, or its longest prefix that fits with an ellipsis, or '' when not even the ellipsis fits
function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  if (ctx.measureText(ELLIPSIS).width > maxWidth) return ''

  let low = 0
  let high = text.length - 1

  while (low < high) {
    const middle = Math.ceil((low + high) / 2)

    if (ctx.measureText(text.slice(0, middle) + ELLIPSIS).width <= maxWidth) {
      low = middle
      continue
    }

    high = middle - 1
  }

  return text.slice(0, low).trimEnd() + ELLIPSIS
}

function nodeRadius(node, nodeRelSize) {
  // same as force-graph's own node size
  return Math.sqrt(Math.max(0, node.val || 1)) * nodeRelSize
}

// point at t = 0.5 of a straight line, quadratic curve (one control point) or cubic self loop (two)
function curveMidpoint(start, end, controlPoints) {
  if (!controlPoints) {
    return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
  }

  if (controlPoints.length === 2) {
    const [cx, cy] = controlPoints
    return {
      x: 0.25 * start.x + 0.5 * cx + 0.25 * end.x,
      y: 0.25 * start.y + 0.5 * cy + 0.25 * end.y
    }
  }

  const [c1x, c1y, c2x, c2y] = controlPoints
  return {
    x: 0.125 * start.x + 0.375 * c1x + 0.375 * c2x + 0.125 * end.x,
    y: 0.125 * start.y + 0.375 * c1y + 0.375 * c2y + 0.125 * end.y
  }
}

function nodeText(node) {
  return String(node.name ?? node.id)
}

// tooltips render strings as html, an element shows the text as is
function textElement(text) {
  const element = document.createElement('span')
  element.textContent = text
  return element
}

// black text on light nodes, white on dark ones
function textColorFor(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color ?? '')) return '#000'

  const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#000' : '#fff'
}

// links hold node ids until force-graph replaces them with the node objects
function endId(end) {
  return typeof end === 'object' ? end.id : end
}

// number and string ids stay distinct, unlike in a template string
function linkKey(source, target, label) {
  return JSON.stringify([source, target, label ?? null])
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
