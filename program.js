import { program } from 'commander'
import pkg from './package.json' with { type: 'json' }
import config from './config.js'

program
  .name('catgraph')
  .version(pkg.version)
  .option('--historySize <historySize>', 'How many sent lines to keep for replaying the graph to a reconnecting page (e.g. on refresh)', config.historySize)

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
