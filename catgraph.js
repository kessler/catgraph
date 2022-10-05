#!/usr/bin/env node

const json = require('./json')
const fdg = require('./index')
const split = require('split')
const { pipeline } = require('stream/promises')

// const program = require('./program')

async function main() {
  const fdgStream = await fdg( /*program*/ )
  await pipeline(process.stdin, split(), parser(), fdgStream())
}

main()

function parser() {
  return async function*(stream) {
    for await (const line of stream) {
      const [source, target] = line.split('--')
      yield { source, target }
    }
  }
}