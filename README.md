# catgraph (WIP)

Pipe graph data to browser.

<img src="/screenshot.png?raw=true" width="400">

### simple example

```
echo 1--2\n2--3\n2--4\n4--1\n5 | catgraph
```
<img src="/screenshot1.png?raw=true" width="400">

### json helps with customization

```
echo -e '{ "id": 1, "val": 5, "name": "a" }--{ "id": 2, "val": 3, "name": "b" }\n{ "id": 3, "val": 2, "name": "a" }' | catgraph
```
<img src="/screenshot2.png?raw=true" width="400">

### dev

```
npm run build_dev; node testEmitter.js | env DEBUG=catgraph ./catgraph.js
```
