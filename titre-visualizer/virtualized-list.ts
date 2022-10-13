// Stripped down version of https://github.com/patrick-steele-idem/morphdom
const morphdom = (fromNode: HTMLElement, toNode: HTMLElement) => {
	const ELEMENT_NODE = 1
	const DOCUMENT_FRAGMENT_NODE = 11
	const TEXT_NODE = 3
	const COMMENT_NODE = 8

	const getNodeKey = (node: any) => node.nodeIndex

	// This object is used as a lookup to quickly find all keyed elements in the original DOM tree.
	const fromNodesLookup = Object.create(null)

	const keyedRemovalList: any[] = []
	const addKeyedRemoval = (key: any) => {
		keyedRemovalList.push(key)
	}

	const walkDiscardedChildNodes = (node: Node, skipKeyedNodes: boolean) => {
		if (node.nodeType === ELEMENT_NODE) {
			let curChild = node.firstChild
			while (curChild) {
				let key = undefined

				if (skipKeyedNodes && (key = getNodeKey(curChild))) {
					// If we are skipping keyed nodes then we add the key
					// to a list so that it can be handled at the very end.
					addKeyedRemoval(key)
				} else {
					// Only report the node as discarded if it is not keyed. We do this because
					// at the end we loop through all keyed elements that were unmatched
					// and then discard them in one final pass.
					if (curChild.firstChild) {
						walkDiscardedChildNodes(curChild, skipKeyedNodes)
					}
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

	const indexTree = (node: Node) => {
		if (node.nodeType === ELEMENT_NODE || node.nodeType === DOCUMENT_FRAGMENT_NODE) {
			let curChild = node.firstChild
			while (curChild) {
				const key = getNodeKey(curChild)
				if (key) {
					fromNodesLookup[key] = curChild
				}
				indexTree(curChild)
				curChild = curChild.nextSibling
			}
		}
	}
	indexTree(fromNode)

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

	const handleNodeAdded = (el: Node) => {
		let curChild = el.firstChild
		while (curChild) {
			const nextSibling = curChild.nextSibling

			const key = getNodeKey(curChild)
			if (key) {
				const unmatchedFromEl = fromNodesLookup[key]
				// if we find a duplicate #id node in cache, replace `el` with cache value
				// and morph it to the child node.
				if (unmatchedFromEl && compareNodeNames(curChild, unmatchedFromEl)) {
					curChild.parentNode?.replaceChild(unmatchedFromEl, curChild)
					morphEl(unmatchedFromEl, curChild)
				} else {
					handleNodeAdded(curChild)
				}
			} else {
				// recursively call for curChild and it's children to see if we find something in
				// fromNodesLookup
				handleNodeAdded(curChild)
			}

			curChild = nextSibling
		}
	}

	const morphEl = (fromEl: Node, toEl: Node) => {
		const toElKey = getNodeKey(toEl)

		if (toElKey) {
			// If an element with an ID is being morphed then it will be in the final
			// DOM so clear it out of the saved elements collection
			delete fromNodesLookup[toElKey]
		}

		let curToNodeChild = toEl.firstChild
		let curFromNodeChild = fromEl.firstChild
		let curToNodeKey
		let curFromNodeKey

		let fromNextSibling = null
		let toNextSibling
		let matchingFromEl

		// walk the children
		outer: while (curToNodeChild) {
			toNextSibling = curToNodeChild.nextSibling
			curToNodeKey = getNodeKey(curToNodeChild)

			// walk the fromNode children all the way through
			while (curFromNodeChild !== null) {
				fromNextSibling = curFromNodeChild.nextSibling

				if (curToNodeChild.isSameNode && curToNodeChild.isSameNode(curFromNodeChild)) {
					curToNodeChild = toNextSibling
					curFromNodeChild = fromNextSibling
					continue outer
				}

				curFromNodeKey = getNodeKey(curFromNodeChild)

				const curFromNodeType = curFromNodeChild.nodeType

				// this means if the curFromNodeChild doesnt have a match with the curToNodeChild
				let isCompatible = undefined

				if (curFromNodeType === curToNodeChild.nodeType) {
					if (curFromNodeType === ELEMENT_NODE) {
						// Both nodes being compared are Element nodes

						if (curToNodeKey) {
							// The target node has a key so we want to match it up with the correct element
							// in the original DOM tree
							if (curToNodeKey !== curFromNodeKey) {
								// The current element in the original DOM tree does not have a matching key so
								// let's check our lookup to see if there is a matching element in the original
								// DOM tree
								if ((matchingFromEl = fromNodesLookup[curToNodeKey])) {
									if (fromNextSibling === matchingFromEl) {
										// Special case for single element removals. To avoid removing the original
										// DOM node out of the tree (since that can break CSS transitions, etc.),
										// we will instead discard the current node and wait until the next
										// iteration to properly match up the keyed target element with its matching
										// element in the original tree
										isCompatible = false
									} else {
										// We found a matching keyed element somewhere in the original DOM tree.
										// Let's move the original DOM node into the current position and morph
										// it.

										// NOTE: We use insertBefore instead of replaceChild because we want to go through
										// the `removeNode()` function for the node that is being discarded so that
										// all lifecycle hooks are correctly invoked
										fromEl.insertBefore(matchingFromEl, curFromNodeChild)

										if (curFromNodeKey) {
											// Since the node is keyed it might be matched up later so we defer
											// the actual removal to later
											addKeyedRemoval(curFromNodeKey)
										} else {
											// NOTE: we skip nested keyed nodes from being removed since there is
											//       still a chance they will be matched up later
											removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */)
										}

										curFromNodeChild = matchingFromEl
									}
								} else {
									// The nodes are not compatible since the "to" node has a key and there
									// is no matching keyed node in the source tree
									isCompatible = false
								}
							}
						} else if (curFromNodeKey) {
							// The original has a key
							isCompatible = false
						}

						if (curFromNodeChild) {
							isCompatible = isCompatible !== false && compareNodeNames(curFromNodeChild, curToNodeChild)
							if (isCompatible) {
								// We found compatible DOM elements so transform
								// the current "from" node to match the current
								// target DOM node.
								// MORPH
								morphEl(curFromNodeChild, curToNodeChild)
							}
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

				// No compatible match so remove the old node from the DOM and continue trying to find a
				// match in the original DOM. However, we only do this if the from node is not keyed
				// since it is possible that a keyed node might match up with a node somewhere else in the
				// target tree and we don't want to discard it just yet since it still might find a
				// home in the final DOM tree. After everything is done we will remove any keyed nodes
				// that didn't find a home
				if (curFromNodeKey) {
					// Since the node is keyed it might be matched up later so we defer
					// the actual removal to later
					addKeyedRemoval(curFromNodeKey)
				} else if (curFromNodeChild !== null) {
					// NOTE: we skip nested keyed nodes from being removed since there is
					//       still a chance they will be matched up later
					removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */)
				}

				curFromNodeChild = fromNextSibling
			} // while(curFromNodeChild)

			// If we got this far then we did not find a candidate match for
			// our "to node" and we exhausted all of the children "from"
			// nodes. Therefore, we will just append the current "to" node
			// to the end
			if (
				curToNodeKey &&
				(matchingFromEl = fromNodesLookup[curToNodeKey]) &&
				compareNodeNames(matchingFromEl, curToNodeChild)
			) {
				fromEl.appendChild(matchingFromEl)
				// MORPH
				morphEl(matchingFromEl, curToNodeChild)
			} else {
				fromEl.appendChild(curToNodeChild)
				handleNodeAdded(curToNodeChild)
			}

			curToNodeChild = toNextSibling
			curFromNodeChild = fromNextSibling
		}

		// We have processed all of the "to nodes". If curFromNodeChild is
		// non-null then we still have some from nodes left over that need
		// to be removed
		while (curFromNodeChild) {
			const fromNextSibling = curFromNodeChild.nextSibling
			if ((curFromNodeKey = getNodeKey(curFromNodeChild))) {
				// Since the node is keyed it might be matched up later so we defer
				// the actual removal to later
				addKeyedRemoval(curFromNodeKey)
			} else {
				// NOTE: we skip nested keyed nodes from being removed since there is
				//       still a chance they will be matched up later
				removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */)
			}
			curFromNodeChild = fromNextSibling
		}
	}

	if (fromNode !== toNode) {
		if (toNode.isSameNode && toNode.isSameNode(fromNode)) {
			return
		}

		morphEl(fromNode, toNode)

		// We now need to loop over any keyed nodes that might need to be
		// removed. We only do the removal if we know that the keyed node
		// never found a match. When a keyed node is matched up we remove
		// it out of fromNodesLookup and we use fromNodesLookup to determine
		// if a keyed node has been matched up or not
		if (keyedRemovalList) {
			for (let i = 0, len = keyedRemovalList.length; i < len; i++) {
				const elToRemove = fromNodesLookup[keyedRemovalList[i]]
				if (elToRemove) {
					removeNode(elToRemove, elToRemove.parentNode, false)
				}
			}
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
			let size = 0
			if (typeof vl.options.rowHeight === "function") {
				size = vl.options.rowHeight(index)
			} else {
				size = Array.isArray(vl.options.rowHeight) ? vl.options.rowHeight[index] : vl.options.rowHeight
			}

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

const getVisibleRange = (vl: VirtualizedList, containerSize: number, offset: number, overscanCount?: number) => {
	const totalSize = getTotalSize(vl.sizeAndPosition)

	if (totalSize === 0) {
		return { start: 0, stop: 0 }
	}

	const maxOffset = offset + containerSize
	let start = findNearestItem(vl, offset)
	let stop = start

	const datum = getSizeAndPositionForIndex(vl, start)
	offset = datum.offset + datum.size

	while (offset < maxOffset && stop < vl.sizeAndPosition.itemCount - 1) {
		stop++
		offset += getSizeAndPositionForIndex(vl, stop).size
	}

	if (overscanCount !== undefined) {
		start = Math.max(0, start - overscanCount)
		stop = Math.min(stop + overscanCount, vl.sizeAndPosition.itemCount)
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
	estimatedRowHeight: number
	rowHeight: number | number[] | ((index: number) => number)
	initialScrollTop?: number
	initialIndex?: number
	overscanCount?: number
	onScroll?: (scrollTop: number, event: Event) => void
	onRowsRendered?: (startIndex: number, stopIndex: number) => void
}

export type VirtualizedList = {
	container: HTMLElement
	inner: HTMLElement
	content: HTMLElement
	options: VirtualizedListOptions
	state: { height: number; offset: number }
	sizeAndPosition: SizeAndPosition
}

export const createVirtualizedList = (container: HTMLElement, options: VirtualizedListOptions) => {
	const vl: VirtualizedList = {
		container: container,
		options: options,
		state: { height: 0, offset: 0 },
		sizeAndPosition: createSizeAndPosition(options.rowCount, options.estimatedRowHeight),
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

	const offset =
		options.initialScrollTop || (options.initialIndex != null && getRowOffset(vl, options.initialIndex)) || 0

	setState(
		vl,
		{
			offset,
			height: options.height,
		},
		() => {
			if (offset) {
				container.scrollTop = offset
			}

			// Add event listeners
			container.addEventListener("scroll", (event) => handleScroll(vl, event))
		}
	)

	return vl
}

const setState = (vl: VirtualizedList, state = {}, callback?: () => void) => {
	vl.state = Object.assign(vl.state, state)

	requestAnimationFrame(() => {
		render(vl)
		callback?.()
	})
}

export const resize = (vl: VirtualizedList, height: number, callback?: () => void) =>
	setState(
		vl,
		{
			height,
		},
		callback
	)

const handleScroll = (vl: VirtualizedList, e: Event) => {
	const offset = vl.container.scrollTop
	setState(vl, { offset })
	vl.options.onScroll?.(offset, e)
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
	vl.sizeAndPosition = createSizeAndPosition(count, vl.options.estimatedRowHeight)
	render(vl)
}

const render = (vl: VirtualizedList) => {
	const { start, stop } = getVisibleRange(vl, vl.state.height, vl.state.offset, vl.options.overscanCount)
	const fragment = document.createElement("div")
	for (let index = start; index <= stop; index++) {
		fragment.appendChild(vl.options.renderRow(index))
	}
	vl.inner.style.height = `${getTotalSize(vl.sizeAndPosition)}px`
	vl.content.style.top = `${getRowOffset(vl, start)}px`
	morphdom(vl.content, fragment)
	vl.options.onRowsRendered?.(start, stop)
}
