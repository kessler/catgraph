---
name: catgraph
description: Pipe edges (pairs of related things) from a shell pipeline into an interactive force-directed graph in the browser using the globally-installed `catgraph` CLI. Use this skill whenever the user asks to "graph", "visualize", "draw" or "map" relationships, connections, dependencies or a network on the command line - module/import graphs, package dependencies, call graphs, service topology, git commit ancestry, links between files or records, state machines, org charts. Also reach for it proactively when you've just produced a list of pairs (A -> B, parent/child, from/to columns) and seeing the structure would help the user spot clusters, cycles, hubs or orphans faster than reading rows. Prefer catgraph over writing one-off graphviz/networkx scripts when the user just wants a quick interactive look. For numeric data over time use catchart instead.
version: "{{VERSION}}"
---

# catgraph

`catgraph` turns stdin into an interactive force-directed graph (force-graph on canvas) in the browser. It opens the default browser, streams the graph over a websocket as lines arrive, and shuts the local server down ~2 seconds after stdin closes. The rendered graph stays in the tab; nodes can be dragged, and the view zoomed and panned.

It works for finite input and for slow or live streams - nodes and edges are added as lines arrive.

## When to reach for it

Use catgraph when the question is about *structure*: what connects to what, what depends on what, where the clusters, cycles, hubs or disconnected pieces are. Strong triggers:

- "graph the dependencies", "show me how these connect", "visualize this network", "map the imports"
- After producing a list of pairs and the user asks "what does this look like?" or "are there cycles?"
- Exploring relationships in logs or data: caller -> callee, service -> service, user -> group, file -> file

Don't use it for: numeric series (use catchart), static images to save to disk or put in a doc (graphviz `dot` writing an SVG/PNG is the better tool), or when the user needs an exact answer like "is there a cycle" - compute that, and use catgraph only to show it.

## How to invoke

```
<producer> | catgraph [--historySize <n>]
```

Each input line is one of:

| Line | Meaning |
|---|---|
| `a--b` | an edge from node `a` to node `b` (drawn with an arrow, so direction matters) |
| `a` | a single node, with no edges |
| `{"id":1,"name":"api","val":3}--{"id":2,"name":"db"}` | same, with JSON nodes for customization |

Nodes are created the first time they appear; repeated edges are drawn once.

### JSON nodes

A side of the edge that parses as a JSON object with an `id` becomes a node with those properties:

- `id` - identity (required; without it the whole text is treated as a plain id)
- `name` - label shown on hover
- `val` - node size, and nodes with the same `val` share a color. Use it to encode a category or weight.

Generate JSON sides with `jq -c` / `tojson` so they stay on one line with no stray spaces.

### Recipes

**Edges from a two-column CSV/TSV**
```
awk -F, '{print $1 "--" $2}' edges.csv | catgraph
```

**git commit ancestry (parent -> child)**
```
git log --pretty='%p %h' | awk '{for (i = 1; i < NF; i++) print $i "--" $NF}' | catgraph
```

**JSON records with labels and categories**
```
jq -r '.[] | "\({id: .from, name: .from, val: .kind} | tojson)--\({id: .to, name: .to} | tojson)"' links.json | catgraph
```

**Relative imports in a flat `src/` directory (file -> imported file)**
```
grep -rEo "from '\./[^']+'" src | sed -E "s#^src/##; s#:from '\./(.*)'#--\1#" | catgraph
```
Both sides must come out as the same string for the same file (`a.js`, not `src/a.js` on one side and `./a.js` on the other), or the graph won't connect. For nested directories, resolve the import paths properly (e.g. a small node script) instead of using sed.

## Things worth knowing

**`--` is the separator, and nothing is trimmed.** `a -- b` creates nodes `"a "` and `" b"`, so write `a--b`. Only the first two parts are used (`a--b--c` becomes the edge `a--b`), and an id or a JSON value that contains `--` is split in the wrong place. If the data might contain `--`, replace it first (e.g. with `sed`).

**Ids are compared exactly.** The plain line `1--2` creates string ids `"1"` and `"2"`, while the JSON `{"id":1}` has the number `1`, so they are different nodes. Pick one form for the whole input.

**The first appearance of a node wins.** If a node first appears as a plain id and later as JSON, the later `name`/`val` are ignored. Emit JSON nodes the first time a node appears.

**One viewer at a time.** Only the first browser tab gets the stream; other connections are refused.

**Refreshing works only while input is still flowing.** A refreshed page gets the most recent lines replayed, up to `--historySize` (default 1,000,000). Once stdin has closed and the server has shut down, a refresh finds nothing - the original tab keeps showing the graph.

**Config.** Options can also be set in a `.catgraphrc` file (JSON, e.g. `{ "historySize": 5000 }`) or `catgraph_historySize`, via the rc module.

**Big graphs.** Everything is drawn in the browser, and very large graphs get slow to lay out. For huge inputs, filter or aggregate in the pipeline first (e.g. `sort -u`, `head`, dropping leaf nodes) rather than piping everything.

## Example: surfacing this to the user

When you decide a graph would help, say what you're piping and what the nodes and edges mean, then run it:

> "I'll pipe each file's relative imports into catgraph so you can see which modules are hubs and whether there are cycles."
>
> ```
> grep -rEo "from '\./[^']+'" src | sed -E "s#^src/##; s#:from '\./(.*)'#--\1#" | catgraph
> ```

Keep the command visible - the user often wants to tweak the pipeline themselves.
