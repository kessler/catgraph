#!/usr/bin/env node

import { pipeline } from 'node:stream/promises'
import catgraph from './index.js'
import installSkill from './installSkill.js'
import parser from './parser.js'
import program, { installSkillCommand, validateBoolean, validateHistorySize, validateNodeLabels } from './program.js'

program.action(async options => {
  const catgraphStream = await catgraph({
    historySize: validateHistorySize(options.historySize),
    nodeLabels: validateNodeLabels(options.nodeLabels),
    disableNodeHover: validateBoolean('disableNodeHover', options.disableNodeHover),
    disableEdgeHover: validateBoolean('disableEdgeHover', options.disableEdgeHover)
  })
  process.stdin.setEncoding('utf8')
  await pipeline(process.stdin, lines(), parser(), catgraphStream())
})

installSkillCommand.action(installSkill)

await program.parseAsync()

function lines() {
  return async function*(stream) {
    let remainder = ''

    for await (const chunk of stream) {
      const parts = (remainder + chunk).split(/\r?\n/)
      remainder = parts.pop()
      yield* parts.filter(line => line.length > 0)
    }

    if (remainder.length > 0) {
      yield remainder
    }
  }
}
