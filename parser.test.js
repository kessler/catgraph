import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseLine } from './parser.js'

test('edge', () => {
  assert.deepEqual(parseLine('a--b'), { source: 'a', target: 'b' })
})

test('single node', () => {
  assert.deepEqual(parseLine('a'), { source: 'a', target: undefined })
})

test('labelled edge', () => {
  assert.deepEqual(parseLine('a--[calls]--b'), { source: 'a', target: 'b', label: 'calls' })
})

test('empty label is an unlabelled edge', () => {
  assert.deepEqual(parseLine('a--[]--b'), { source: 'a', target: 'b' })
})

test('label may contain the separators', () => {
  assert.deepEqual(parseLine('a--[x--y]--z]--b'), { source: 'a', target: 'b', label: 'x--y]--z' })
})

test('labelled edge between json nodes', () => {
  assert.deepEqual(parseLine('{"id":1}--[1]--{"id":2}'), { source: '{"id":1}', target: '{"id":2}', label: '1' })
})

test('unclosed label is a plain edge', () => {
  assert.deepEqual(parseLine('a--[b'), { source: 'a', target: '[b' })
})
