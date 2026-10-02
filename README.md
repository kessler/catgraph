# catgraph (WIP)

Pipe graph data to browser.

<img src="/screenshot.png?raw=true" width="400">

### simple example

```bash
printf '1--2\n2--3\n2--4\n4--1\n5\n' | catgraph
```
<img src="/screenshot1.png?raw=true" width="400">

### json helps with customization

```bash
echo -e '{ "id": 1, "val": 5, "name": "a" }--{ "id": 2, "val": 3, "name": "b" }\n{ "id": 3, "val": 2, "name": "a" }' | catgraph
```
<img src="/screenshot2.png?raw=true" width="400">

### edge labels

Put the label in brackets between the two nodes. Edges between the same nodes with different labels are drawn as separate curved edges.

```bash
printf 'api--[calls]--db\napi--[reads]--db\ndb--[replies]--api\n' | catgraph
```

Node text (`name`, or `id` when there is no name) and edge labels are drawn once they are large enough to read at the current zoom, and are always shown on hover.

### options

```
--historySize <historySize>  how many sent lines to keep for replaying the graph
                             to a reconnecting page, e.g. on refresh (default: 1000000)
--nodeLabels <nodeLabels>    where node text is drawn: inside or outside the node (default: inside)
--disableNodeHover           disable the tooltip shown when hovering a node
--disableEdgeHover           disable the tooltip shown when hovering an edge
```

Options can also be set in a config file, e.g. `.catgraphrc`:

```json
{ "historySize": 5000, "nodeLabels": "outside", "disableEdgeHover": true }
```

See the [rc](https://www.npmjs.com/package/rc) module for all config file locations.

### requirements

Node.js 22.12 or newer.

### dev

```
npm run build_dev; node testEmitter.js | env DEBUG=catgraph ./catgraph.js
npm test
```
