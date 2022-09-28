export const sortAsc = (arr: number[]) => arr.sort((a, b) => a - b)
export const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
export const mean = (arr: number[]) => sum(arr) / arr.length

export const cumSum = (arr: number[]) => {
	const result: number[] = []
	let current = 0
	for (const val of arr) {
		current += val
		result.push(current)
	}
	return result
}

export const sd = (arr: number[]) => {
	const mu = mean(arr)
	const diffArr = arr.map((a) => (a - mu) ** 2)
	return Math.sqrt(sum(diffArr) / (arr.length - 1))
}

export const sortedAscQuantile = (sorted: number[], q: number) => {
	const pos = (sorted.length - 1) * q
	const base = Math.floor(pos)
	const rest = pos - base
	let result = sorted[base]
	if (sorted[base + 1] !== undefined) {
		result += rest * (sorted[base + 1] - sorted[base])
	}
	return result
}

export const quantile = (arr: number[], q: number) => sortedAscQuantile(sortAsc(arr), q)
export const sortedAscMin = (sorted: number[]) => sorted[0]
export const sortedAscMax = (sorted: number[]) => sorted[sorted.length - 1]
export const unique = <T>(arr: T[]) => Array.from(new Set(arr))
export const removeIndex = <T>(arr: T[], index: number) => arr.splice(index, 1)

export const arrLinSearch = <T>(arr: T[], item: T) => {
	let result = -1
	for (let index = 0; index < arr.length; index += 1) {
		const elem = arr[index]
		if (elem === item) {
			result = index
			break
		}
	}
	return result
}

export const generalSort = <T>(x: T, y: T) => (x > y ? 1 : x < y ? -1 : 0)
export const numberSort = (x: number, y: number) => x - y

export const desiredOrderSort = <T>(ord: T[]) => {
	return (a: T, b: T) => {
		let result = 0
		const ai = ord.indexOf(a)
		const bi = ord.indexOf(b)
		if (ai !== -1 || bi !== -1) {
			if (ai === -1) {
				result = 1
			} else if (bi === -1) {
				result = -1
			} else if (ai > bi) {
				result = 1
			} else if (ai < bi) {
				result = -1
			}
		}
		return result
	}
}
type NestedArrIter<T> = {
	arrIndices: number[]
	done: boolean
	nestedArr: T[][]
}

export const beginNestedArrIter = <T>(nestedArr: T[][]): NestedArrIter<T> => {
	const arrIndices = [] as number[]
	for (let arrIndex = 0; arrIndex < nestedArr.length; arrIndex += 1) {
		arrIndices.push(0)
	}
	return {
		arrIndices: arrIndices,
		done: false,
		nestedArr: nestedArr,
	}
}

export const getCurrentNestedArrValues = <T>(iter: NestedArrIter<T>) => {
	const facets = [] as T[]
	for (let facetSetIndex = 0; facetSetIndex < iter.nestedArr.length; facetSetIndex += 1) {
		const setValueIndex = iter.arrIndices[facetSetIndex]
		facets.push(iter.nestedArr[facetSetIndex][setValueIndex])
	}
	return facets
}

export const nextNestedArrIter = <T>(iter: NestedArrIter<T>) => {
	let nestedArrCurrentSetIndex = iter.arrIndices.length - 1
	while (true) {
		if (nestedArrCurrentSetIndex == -1) {
			iter.done = true
			break
		}
		if (iter.arrIndices[nestedArrCurrentSetIndex] >= iter.nestedArr[nestedArrCurrentSetIndex].length - 1) {
			iter.arrIndices[nestedArrCurrentSetIndex] = 0
			nestedArrCurrentSetIndex -= 1
		} else {
			iter.arrIndices[nestedArrCurrentSetIndex] += 1
			break
		}
	}
}

export const expandGrid = <T>(input: T[][]): T[][] => {
	const result: T[][] = []
	for (const nestedArrIter = beginNestedArrIter(input); !nestedArrIter.done; nextNestedArrIter(nestedArrIter)) {
		const nestedArrs = getCurrentNestedArrValues(nestedArrIter)
		result.push(nestedArrs)
	}
	return result
}
