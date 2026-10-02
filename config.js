import rc from 'rc'

export default rc('catgraph', {
  // how many sent lines to keep for replaying to a reconnecting page (e.g. on refresh)
  historySize: 1_000_000,
  // where node text is drawn: inside or outside the node
  nodeLabels: 'inside',
  disableNodeHover: false,
  disableEdgeHover: false
})
