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

### options

```
--historySize <historySize>  how many sent lines to keep for replaying the graph
                             to a reconnecting page, e.g. on refresh (default: 1000000)
```

Options can also be set in a config file, e.g. `.catgraphrc`:

```json
{ "historySize": 5000 }
```

See the [rc](https://www.npmjs.com/package/rc) module for all config file locations.

### requirements

Node.js 22.12 or newer.

### dev

```
npm run build_dev; node testEmitter.js | env DEBUG=catgraph ./catgraph.js
```
