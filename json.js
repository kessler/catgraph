module.exports = {
	jsonParse,
	jsonStringify,
	prettyJsonStringify,
	serialize,
	deserialize
}

function jsonParse() {
	return async function*(stream) {
		for await (const chunk of stream) {
			if (chunk.length === 0) continue
			yield deserialize(chunk)
		}
	}
}

function jsonStringify() {
	return async function*(stream) {
		for await (const frame of stream) {
			yield `${serialize(frame)}\n`
		}
	}
}

function prettyJsonStringify() {
	return async function*(stream) {
		for await (const frame of stream) {
			yield `${serialize(frame, null, '\t')}\n`
		}
	}
}

/**
 * handles json serialization/deserializion
 *
 * seems like there's an issue with throwing inside async generators inside a pipeline :(
 * https://github.com/nodejs/node/issues/33792
 * also reporting errors when they happen really helps with debugging
 * also, need to take care of big ints, see: https://dev.to/benlesh/bigint-and-json-stringify-json-parse-2m8p
 */
function serialize (object, _, spacer) {
  try {
    return JSON.stringify(object, serializeBigInt, spacer)
  } catch (e) {
    console.error('failed to JSON.stringify', object)
    console.error(e)
    throw e
  }
}

function serializeBigInt (key, value) {
  return typeof value === 'bigint' ? `BIGINT::${value}` : value
}

function deserialize (text) {
  try {
    return JSON.parse(text, deserializeBigInt)
  } catch (e) {
    console.error('failed to JSON.parse', text)
    console.error(e)
    throw e
  }
}

function deserializeBigInt (key, value) {
  if (typeof value === 'string' && value.startsWith('BIGINT::')) {
    return BigInt(value.substr(8))
  }

  return value
}