import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import pkg from './package.json' with { type: 'json' }

// installs (or overwrites, e.g. after an upgrade) the Claude Code skill
export default async function installSkill({ project = false } = {}) {
  const baseDir = project ? process.cwd() : os.homedir()
  const skillDir = path.join(baseDir, '.claude', 'skills', 'catgraph')
  const skillPath = path.join(skillDir, 'SKILL.md')

  const template = await fs.readFile(path.join(import.meta.dirname, 'skill.template.md'), 'utf8')
  await fs.mkdir(skillDir, { recursive: true })
  await fs.writeFile(skillPath, template.replaceAll('{{VERSION}}', pkg.version))

  console.log(`installed catgraph skill to ${skillPath}`)
}
