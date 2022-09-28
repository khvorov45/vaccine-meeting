export const unif = (from: number, to: number) => {
	let rand01 = Math.random()
	let range = (to - from)
	let randRange = rand01 * range
	let result = from + randRange
	return result
}

export const norm = (mean: number, sd: number) => {
	let u1 = 0
	let u2 = 0
	while (u1 === 0) { u1 = Math.random() }
	while (u2 === 0) { u2 = Math.random() }
	let randNorm01 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
	let result = randNorm01 * sd + mean
	return result
}
