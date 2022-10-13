// Stripped down version of https://github.com/patrick-steele-idem/morphdom
const ELEMENT_NODE = 1
const TEXT_NODE = 3
const COMMENT_NODE = 8

const walkDiscardedChildNodes = (node: Node, skipKeyedNodes: boolean) => {
	if (node.nodeType === ELEMENT_NODE) {
		let curChild = node.firstChild
		while (curChild) {
			if (curChild.firstChild) {
				walkDiscardedChildNodes(curChild, skipKeyedNodes)
			}
			curChild = curChild.nextSibling
		}
	}
}

const removeNode = (node: Node, parentNode: Node, skipKeyedNodes: boolean) => {
	if (parentNode) {
		parentNode.removeChild(node)
	}
	walkDiscardedChildNodes(node, skipKeyedNodes)
}

const compareNodeNames = (fromEl: Node, toEl: Node) => {
	const fromNodeName = fromEl.nodeName
	const toNodeName = toEl.nodeName

	if (fromNodeName === toNodeName) {
		return true
	}

	const fromCodeStart = fromNodeName.charCodeAt(0)
	const toCodeStart = toNodeName.charCodeAt(0)

	// If the target element is a virtual DOM node or SVG node then we may
	// need to normalize the tag name before comparing. Normal HTML elements that are
	// in the "http://www.w3.org/1999/xhtml"
	// are converted to upper case
	if (fromCodeStart <= 90 && toCodeStart >= 97) {
		// from is upper and to is lower
		return fromNodeName === toNodeName.toUpperCase()
	} else if (toCodeStart <= 90 && fromCodeStart >= 97) {
		// to is upper and from is lower
		return toNodeName === fromNodeName.toUpperCase()
	} else {
		return false
	}
}

const morphEl = (fromEl: Node, toEl: Node) => {
	let curToNodeChild = toEl.firstChild
	let curFromNodeChild = fromEl.firstChild

	let fromNextSibling = null
	let toNextSibling

	// walk the children
	outer: while (curToNodeChild) {
		toNextSibling = curToNodeChild.nextSibling

		// walk the fromNode children all the way through
		while (curFromNodeChild !== null) {
			fromNextSibling = curFromNodeChild.nextSibling

			if (curToNodeChild.isSameNode && curToNodeChild.isSameNode(curFromNodeChild)) {
				curToNodeChild = toNextSibling
				curFromNodeChild = fromNextSibling
				continue outer
			}

			const curFromNodeType = curFromNodeChild.nodeType

			// this means if the curFromNodeChild doesnt have a match with the curToNodeChild
			let isCompatible = undefined

			if (curFromNodeType === curToNodeChild.nodeType) {
				if (curFromNodeType === ELEMENT_NODE && curFromNodeChild) {
					isCompatible = isCompatible !== false && compareNodeNames(curFromNodeChild, curToNodeChild)
					if (isCompatible) {
						// We found compatible DOM elements so transform
						// the current "from" node to match the current
						// target DOM node.
						// MORPH
						morphEl(curFromNodeChild, curToNodeChild)
					}
				} else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
					// Both nodes being compared are Text or Comment nodes
					isCompatible = true
					// Simply update nodeValue on the original node to
					// change the text value
					if (curFromNodeChild.nodeValue !== curToNodeChild.nodeValue) {
						curFromNodeChild.nodeValue = curToNodeChild.nodeValue
					}
				}
			}

			if (isCompatible) {
				// Advance both the "to" child and the "from" child since we found a match
				// Nothing else to do as we already recursively called morphChildren above
				curToNodeChild = toNextSibling
				curFromNodeChild = fromNextSibling
				continue outer
			}

			if (curFromNodeChild !== null) {
				removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */)
			}

			curFromNodeChild = fromNextSibling
		} // while(curFromNodeChild)

		// If we got this far then we did not find a candidate match for
		// our "to node" and we exhausted all of the children "from"
		// nodes. Therefore, we will just append the current "to" node
		// to the end
		fromEl.appendChild(curToNodeChild)

		curToNodeChild = toNextSibling
		curFromNodeChild = fromNextSibling
	}

	// We have processed all of the "to nodes". If curFromNodeChild is
	// non-null then we still have some from nodes left over that need
	// to be removed
	while (curFromNodeChild) {
		const fromNextSibling = curFromNodeChild.nextSibling
		removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */)
		curFromNodeChild = fromNextSibling
	}
}

const morphdom = (fromNode: HTMLElement, toNode: HTMLElement) => {
	if (fromNode !== toNode) {
		if (!(toNode.isSameNode && toNode.isSameNode(fromNode))) {
			morphEl(fromNode, toNode)
		}
	}
}

// Based on https://github.com/clauderic/virtualized-list

type SizeAndPosition = {
	itemCount: number
	estimatedItemSize: number
	// Cache of size and position data for items, mapped by item index.
	itemSizeAndPositionData: { [key in number]: { offset: number; size: number } }
	// Measurements for items up to this index can be trusted; items afterward should be estimated.
	lastMeasuredIndex: number
}

const createSizeAndPosition = (itemCount: number, estimatedItemSize: number) => {
	const result: SizeAndPosition = {
		itemCount: itemCount,
		estimatedItemSize: estimatedItemSize,
		itemSizeAndPositionData: [],
		lastMeasuredIndex: -1,
	}
	return result
}

const getSizeAndPositionOfLastMeasuredItem = (sp: SizeAndPosition) => {
	return sp.lastMeasuredIndex >= 0 ? sp.itemSizeAndPositionData[sp.lastMeasuredIndex] : { offset: 0, size: 0 }
}

const getSizeAndPositionForIndex = (vl: VirtualizedList, index: number) => {
	index = Math.max(Math.min(index, vl.sizeAndPosition.itemCount - 1), 0)

	if (index > vl.sizeAndPosition.lastMeasuredIndex) {
		const lastMeasuredSizeAndPosition = getSizeAndPositionOfLastMeasuredItem(vl.sizeAndPosition)
		let offset = lastMeasuredSizeAndPosition.offset + lastMeasuredSizeAndPosition.size

		for (let i = vl.sizeAndPosition.lastMeasuredIndex + 1; i <= index; i++) {
			const size = vl.options.rowHeight
			vl.sizeAndPosition.itemSizeAndPositionData[i] = {
				offset,
				size,
			}
			offset += size
		}

		vl.sizeAndPosition.lastMeasuredIndex = index
	}

	return vl.sizeAndPosition.itemSizeAndPositionData[index]
}

const getTotalSize = (sp: SizeAndPosition) => {
	const lastMeasuredSizeAndPosition = getSizeAndPositionOfLastMeasuredItem(sp)
	return (
		lastMeasuredSizeAndPosition.offset +
		lastMeasuredSizeAndPosition.size +
		(sp.itemCount - sp.lastMeasuredIndex - 1) * sp.estimatedItemSize
	)
}

const getVisibleRange = (vl: VirtualizedList, containerSize: number, offset: number) => {
	const totalSize = getTotalSize(vl.sizeAndPosition)

	if (totalSize === 0) {
		return { start: 0, stop: 0 }
	}

	const maxOffset = offset + containerSize
	const start = findNearestItem(vl, offset)
	let stop = start

	const datum = getSizeAndPositionForIndex(vl, start)
	offset = datum.offset + datum.size

	while (offset < maxOffset && stop < vl.sizeAndPosition.itemCount - 1) {
		stop++
		offset += getSizeAndPositionForIndex(vl, stop).size
	}

	return {
		start,
		stop,
	}
}

const binarySearch = (vl: VirtualizedList, low: number, high: number, offset: number) => {
	let middle
	let currentOffset

	while (low <= high) {
		middle = low + Math.floor((high - low) / 2)
		currentOffset = getSizeAndPositionForIndex(vl, middle).offset

		if (currentOffset === offset) {
			return middle
		} else if (currentOffset < offset) {
			low = middle + 1
		} else if (currentOffset > offset) {
			high = middle - 1
		}
	}

	if (low > 0) {
		return low - 1
	}

	return low
}

const exponentialSearch = (vl: VirtualizedList, index: number, offset: number) => {
	let interval = 1
	while (index < vl.sizeAndPosition.itemCount && getSizeAndPositionForIndex(vl, index).offset < offset) {
		index += interval
		interval *= 2
	}
	return binarySearch(vl, Math.floor(index / 2), Math.min(index, vl.sizeAndPosition.itemCount - 1), offset)
}

/**
 * Searches for the item (index) nearest the specified offset.
 *
 * If no exact match is found the next lowest item index will be returned.
 * This allows partially visible items (with offsets just before/above the fold) to be visible.
 */
const findNearestItem = (vl: VirtualizedList, offset: number) => {
	// Our search algorithms find the nearest match at or below the specified offset.
	// So make sure the offset is at least 0 or no match will be found.
	offset = Math.max(0, offset)

	const lastMeasuredSizeAndPosition = getSizeAndPositionOfLastMeasuredItem(vl.sizeAndPosition)
	const lastMeasuredIndex = Math.max(0, vl.sizeAndPosition.lastMeasuredIndex)

	if (lastMeasuredSizeAndPosition.offset >= offset) {
		// If we've already measured items within this range just use a binary search as it's faster.
		return binarySearch(vl, 0, lastMeasuredIndex, offset)
	} else {
		// If we haven't yet measured this high, fallback to an exponential search with an inner binary search.
		// The exponential search avoids pre-computing sizes for the full set of items as a binary search would.
		// The overall complexity for this approach is O(log n).
		return exponentialSearch(vl, lastMeasuredIndex, offset)
	}
}

export type VirtualizedListOptions = {
	height: number
	rowCount: number
	renderRow: (rowIndex: number) => HTMLElement
	rowHeight: number
}

export type VirtualizedList = {
	container: HTMLElement
	inner: HTMLElement
	content: HTMLElement
	options: VirtualizedListOptions
	height: number
	offset: number
	sizeAndPosition: SizeAndPosition
}

export const createVirtualizedList = (container: HTMLElement, options: VirtualizedListOptions) => {
	const vl: VirtualizedList = {
		container: container,
		options: options,
		height: options.height,
		offset: 0,
		sizeAndPosition: createSizeAndPosition(options.rowCount, options.rowHeight),
		inner: document.createElement("div"),
		content: document.createElement("div"),
	}

	vl.inner.setAttribute(
		"style",
		"position:relative; overflow:hidden; width:100%; min-height:100%; will-change: transform;"
	)
	vl.content.setAttribute("style", "position:absolute; top:0; left:0; height:100%; width:100%; overflow:visible;")
	vl.inner.appendChild(vl.content)
	container.appendChild(vl.inner)

	container.scrollTop = vl.offset
	container.addEventListener("scroll", () => handleScroll(vl))

	requestAnimationFrame(() => render(vl))
	return vl
}

export const setHeight = (vl: VirtualizedList, height: number) => {
	vl.height = height
	requestAnimationFrame(() => render(vl))
}

const setOffset = (vl: VirtualizedList, offset: number) => {
	vl.offset = offset
	requestAnimationFrame(() => render(vl))
}

const handleScroll = (vl: VirtualizedList) => {
	const offset = vl.container.scrollTop
	setOffset(vl, offset)
}

const getRowOffset = (vl: VirtualizedList, index: number) => {
	const sizeAndPosition = getSizeAndPositionForIndex(vl, index)
	let offset = 0
	if (sizeAndPosition !== undefined) {
		offset = sizeAndPosition.offset
	}
	return offset
}

export const setRowCount = (vl: VirtualizedList, count: number) => {
	vl.sizeAndPosition = createSizeAndPosition(count, vl.options.rowHeight)
	render(vl)
}

const render = (vl: VirtualizedList) => {
	const { start, stop } = getVisibleRange(vl, vl.height, vl.offset)
	const fragment = document.createElement("div")
	for (let index = start; index <= stop; index++) {
		fragment.appendChild(vl.options.renderRow(index))
	}
	vl.inner.style.height = `${getTotalSize(vl.sizeAndPosition)}px`
	vl.content.style.top = `${getRowOffset(vl, start)}px`
	morphdom(vl.content, fragment)
}
