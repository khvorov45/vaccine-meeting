type NestedArrIter = {
	arrIndices: number[],
	done: boolean,
	nestedArr: any[][],
}

export const beginNestedArrIter = (nestedArr: any[][]): NestedArrIter => {
	let arrIndices = [] as number[]
	for (let arrIndex = 0; arrIndex < nestedArr.length; arrIndex += 1) {
		arrIndices.push(0)
	}
	return {
		arrIndices: arrIndices,
		done: false,
		nestedArr: nestedArr,
	}
}

export const getCurrentNestedArrValues = (iter: NestedArrIter) => {
	let facets = [] as any[]
	for (let facetSetIndex = 0; facetSetIndex < iter.nestedArr.length; facetSetIndex += 1) {
		const setValueIndex = iter.arrIndices[facetSetIndex]
		facets.push(iter.nestedArr[facetSetIndex][setValueIndex])
	}
	return facets
}

export const nextNestedArrIter = (iter: NestedArrIter) => {
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

export const expandGrid = (input: any[][]): any[][] => {
	const result: any[] = []
	for (const nestedArrIter = beginNestedArrIter(input);
		!nestedArrIter.done;
		nextNestedArrIter(nestedArrIter))
	{
		let nestedArrs = getCurrentNestedArrValues(nestedArrIter)
		result.push(nestedArrs)
	}
	return result
}
