function random (from, to) {
	return Math.floor(Math.random() * to) + from
}

const elementTypes = 10

for (let i = 0; i < 20; i++) {
	let s = ''
	for (let x = 0; x < 5; x++) {
		
		if (x > 0) {
			s += '\n'
		}
		const a = random(1, 100)
		s += `{ "id": ${a}, "name": "${a}", "val": ${a % elementTypes} }`

		if (random(1, 100) > 50) {
			const b = random(1, 100)
			s += `--{ "id": ${b}, "name": "${b}", "val": ${b % elementTypes} }`
		}
	}

	console.log(s)
}
