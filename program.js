import { program } from 'commander'
import pkg from './package.json' with { type: 'json' }
import config from './config.js'

const NODE_LABELS = ['inside', 'outside']

program
  .name('catgraph')
  .version(pkg.version)
  .option('--historySize <historySize>', 'How many sent lines to keep for replaying the graph to a reconnecting page (e.g. on refresh)', config.historySize)
  .option('--nodeLabels <nodeLabels>', `Where node text is drawn: ${NODE_LABELS.join(' or ')} the node`, config.nodeLabels)
  .option('--disableNodeHover', 'Disable the tooltip shown when hovering a node', config.disableNodeHover)
  .option('--disableEdgeHover', 'Disable the tooltip shown when hovering an edge', config.disableEdgeHover)

export const installSkillCommand = program.command('install-skill')
  .description('Install the catgraph Claude Code skill to ~/.claude/skills/catgraph/SKILL.md')
  .option('--project', 'Install to ./.claude/skills/catgraph/SKILL.md in the current directory instead')

export default program

// validated here and not by commander since the value may also come from rc (config file, env or argv)
export function validateHistorySize(value) {
  const historySize = Number(value)

  if (!Number.isInteger(historySize) || historySize < 0) {
    program.error(`error: --historySize must be a non-negative integer, got '${value}'`)
  }

  return historySize
}

export function validateNodeLabels(value) {
  if (!NODE_LABELS.includes(value)) {
    program.error(`error: --nodeLabels must be one of ${NODE_LABELS.join(', ')}, got '${value}'`)
  }

  return value
}

// rc values from env or argv arrive as strings
export function validateBoolean(name, value) {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false

  program.error(`error: --${name} must be true or false, got '${value}'`)
}
