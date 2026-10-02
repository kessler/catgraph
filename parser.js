const LABEL_START = '--['
const LABEL_END = ']--'

export default function parser() {
  return async function*(stream) {
    for await (const line of stream) {
      yield parseLine(line)
    }
  }
}

// a--b is an edge, a--[label]--b is a labelled edge, a is a single node
export function parseLine(line) {
  const start = line.indexOf(LABEL_START)
  const end = line.lastIndexOf(LABEL_END)

  if (start !== -1 && end >= start + LABEL_START.length) {
    const source = line.slice(0, start)
    const target = line.slice(end + LABEL_END.length)
    const label = line.slice(start + LABEL_START.length, end)

    if (label.length === 0) {
      return { source, target }
    }

    return { source, target, label }
  }

  const [source, target] = line.split('--')
  return { source, target }
}
