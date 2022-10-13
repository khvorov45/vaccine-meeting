// Stripped down version of https://github.com/patrick-steele-idem/morphdom
const morphdom = (fromNode, toNode) => {

	const ELEMENT_NODE = 1
	const DOCUMENT_FRAGMENT_NODE = 11
	const TEXT_NODE = 3
	const COMMENT_NODE = 8

	const doc = typeof document === "undefined" ? undefined : document

	const getNodeKey = (node) => node.nodeIndex

	// This object is used as a lookup to quickly find all keyed elements in the original DOM tree.
	const fromNodesLookup = Object.create(null)

	const keyedRemovalList = []
	const addKeyedRemoval = (key) => {
		keyedRemovalList.push(key)
	}

	const walkDiscardedChildNodes = (node, skipKeyedNodes) => {
		if (node.nodeType === ELEMENT_NODE) {
			var curChild = node.firstChild
			while (curChild) {
				var key = undefined

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

	const removeNode = (node, parentNode, skipKeyedNodes) => {
		if (parentNode) {
			parentNode.removeChild(node)
		}
		walkDiscardedChildNodes(node, skipKeyedNodes)
	}

	const indexTree = (node) => {
		if (node.nodeType === ELEMENT_NODE || node.nodeType === DOCUMENT_FRAGMENT_NODE) {
			var curChild = node.firstChild
			while (curChild) {
				var key = getNodeKey(curChild)
				if (key) {
					fromNodesLookup[key] = curChild
				}
				indexTree(curChild)
				curChild = curChild.nextSibling
			}
		}
	}
	indexTree(fromNode)

	const compareNodeNames = (fromEl, toEl) => {
		var fromNodeName = fromEl.nodeName
		var toNodeName = toEl.nodeName
		var fromCodeStart, toCodeStart

		if (fromNodeName === toNodeName) {
			return true
		}

		fromCodeStart = fromNodeName.charCodeAt(0)
		toCodeStart = toNodeName.charCodeAt(0)

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

	const handleNodeAdded = (el) => {
		var curChild = el.firstChild
		while (curChild) {
			var nextSibling = curChild.nextSibling

			var key = getNodeKey(curChild)
			if (key) {
				var unmatchedFromEl = fromNodesLookup[key]
				// if we find a duplicate #id node in cache, replace `el` with cache value
				// and morph it to the child node.
				if (unmatchedFromEl && compareNodeNames(curChild, unmatchedFromEl)) {
					curChild.parentNode.replaceChild(unmatchedFromEl, curChild)
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

	const morphEl = (fromEl, toEl) => {
		var toElKey = getNodeKey(toEl)

		if (toElKey) {
			// If an element with an ID is being morphed then it will be in the final
			// DOM so clear it out of the saved elements collection
			delete fromNodesLookup[toElKey]
		}

		var curToNodeChild = toEl.firstChild
		var curFromNodeChild = fromEl.firstChild
		var curToNodeKey
		var curFromNodeKey

		var fromNextSibling
		var toNextSibling
		var matchingFromEl

		// walk the children
		outer: while (curToNodeChild) {
			toNextSibling = curToNodeChild.nextSibling
			curToNodeKey = getNodeKey(curToNodeChild)

			// walk the fromNode children all the way through
			while (curFromNodeChild) {
				fromNextSibling = curFromNodeChild.nextSibling

				if (curToNodeChild.isSameNode && curToNodeChild.isSameNode(curFromNodeChild)) {
					curToNodeChild = toNextSibling
					curFromNodeChild = fromNextSibling
					continue outer
				}

				curFromNodeKey = getNodeKey(curFromNodeChild)

				var curFromNodeType = curFromNodeChild.nodeType

				// this means if the curFromNodeChild doesnt have a match with the curToNodeChild
				var isCompatible = undefined

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
				} else {
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
				if (curToNodeChild.actualize) {
					curToNodeChild = curToNodeChild.actualize(fromEl.ownerDocument || doc)
				}
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
			var fromNextSibling = curFromNodeChild.nextSibling
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

	const morphedNode = fromNode

	if (morphedNode !== toNode) {
		if (toNode.isSameNode && toNode.isSameNode(morphedNode)) {
			return
		}

		morphEl(morphedNode, toNode)

		// We now need to loop over any keyed nodes that might need to be
		// removed. We only do the removal if we know that the keyed node
		// never found a match. When a keyed node is matched up we remove
		// it out of fromNodesLookup and we use fromNodesLookup to determine
		// if a keyed node has been matched up or not
		if (keyedRemovalList) {
			for (var i = 0, len = keyedRemovalList.length; i < len; i++) {
				var elToRemove = fromNodesLookup[keyedRemovalList[i]]
				if (elToRemove) {
					removeNode(elToRemove, elToRemove.parentNode, false)
				}
			}
		}
	}

	return morphedNode
}

// https://github.com/clauderic/virtualized-list
/* Forked from react-virtualized 💖 */
const ALIGN_START = "start"
const ALIGN_CENTER = "center"
const ALIGN_END = "end"

class SizeAndPositionManager {
	constructor({ itemCount, itemSizeGetter, estimatedItemSize }) {
		this._itemSizeGetter = itemSizeGetter
		this._itemCount = itemCount
		this._estimatedItemSize = estimatedItemSize

		// Cache of size and position data for items, mapped by item index.
		this._itemSizeAndPositionData = {}

		// Measurements for items up to this index can be trusted; items afterward should be estimated.
		this._lastMeasuredIndex = -1
	}

	getLastMeasuredIndex() {
		return this._lastMeasuredIndex
	}

	/**
	 * This method returns the size and position for the item at the specified index.
	 * It just-in-time calculates (or used cached values) for items leading up to the index.
	 */
	getSizeAndPositionForIndex(index) {
		if (index < 0 || index >= this._itemCount) {
			throw Error(`Requested index ${index} is outside of range 0..${this._itemCount}`)
		}

		if (index > this._lastMeasuredIndex) {
			let lastMeasuredSizeAndPosition = this.getSizeAndPositionOfLastMeasuredItem()
			let offset = lastMeasuredSizeAndPosition.offset + lastMeasuredSizeAndPosition.size

			for (var i = this._lastMeasuredIndex + 1; i <= index; i++) {
				let size = this._itemSizeGetter({ index: i })

				if (size == null || isNaN(size)) {
					throw Error(`Invalid size returned for index ${i} of value ${size}`)
				}

				this._itemSizeAndPositionData[i] = {
					offset,
					size,
				}

				offset += size
			}

			this._lastMeasuredIndex = index
		}

		return this._itemSizeAndPositionData[index]
	}

	getSizeAndPositionOfLastMeasuredItem() {
		return this._lastMeasuredIndex >= 0
			? this._itemSizeAndPositionData[this._lastMeasuredIndex]
			: { offset: 0, size: 0 }
	}

	/**
	 * Total size of all items being measured.
	 * This value will be completedly estimated initially.
	 * As items as measured the estimate will be updated.
	 */
	getTotalSize() {
		const lastMeasuredSizeAndPosition = this.getSizeAndPositionOfLastMeasuredItem()

		return (
			lastMeasuredSizeAndPosition.offset +
			lastMeasuredSizeAndPosition.size +
			(this._itemCount - this._lastMeasuredIndex - 1) * this._estimatedItemSize
		)
	}

	/**
	 * Determines a new offset that ensures a certain item is visible, given the alignment.
	 *
	 * @param align Desired alignment within container; one of "start" (default), "center", or "end"
	 * @param containerSize Size (width or height) of the container viewport
	 * @return Offset to use to ensure the specified item is visible
	 */
	getUpdatedOffsetForIndex({ align = ALIGN_START, containerSize, targetIndex }) {
		if (containerSize <= 0) {
			return 0
		}

		const datum = this.getSizeAndPositionForIndex(targetIndex)
		const maxOffset = datum.offset
		const minOffset = maxOffset - containerSize + datum.size

		let idealOffset

		switch (align) {
			case ALIGN_END:
				idealOffset = minOffset
				break
			case ALIGN_CENTER:
				idealOffset = maxOffset - (containerSize - datum.size) / 2
				break
			default:
				idealOffset = maxOffset
				break
		}

		const totalSize = this.getTotalSize()

		return Math.max(0, Math.min(totalSize - containerSize, idealOffset))
	}

	getVisibleRange({ containerSize, offset, overscanCount }) {
		const totalSize = this.getTotalSize()

		if (totalSize === 0) {
			return {}
		}

		const maxOffset = offset + containerSize
		let start = this._findNearestItem(offset)
		let stop = start

		const datum = this.getSizeAndPositionForIndex(start)
		offset = datum.offset + datum.size

		while (offset < maxOffset && stop < this._itemCount - 1) {
			stop++
			offset += this.getSizeAndPositionForIndex(stop).size
		}

		if (overscanCount) {
			start = Math.max(0, start - overscanCount)
			stop = Math.min(stop + overscanCount, this._itemCount)
		}

		return {
			start,
			stop,
		}
	}

	/**
	 * Clear all cached values for items after the specified index.
	 * This method should be called for any item that has changed its size.
	 * It will not immediately perform any calculations; they'll be performed the next time getSizeAndPositionForIndex() is called.
	 */
	resetItem(index) {
		this._lastMeasuredIndex = Math.min(this._lastMeasuredIndex, index - 1)
	}

	_binarySearch({ low, high, offset }) {
		let middle
		let currentOffset

		while (low <= high) {
			middle = low + Math.floor((high - low) / 2)
			currentOffset = this.getSizeAndPositionForIndex(middle).offset

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
	}

	_exponentialSearch({ index, offset }) {
		let interval = 1

		while (index < this._itemCount && this.getSizeAndPositionForIndex(index).offset < offset) {
			index += interval
			interval *= 2
		}

		return this._binarySearch({
			high: Math.min(index, this._itemCount - 1),
			low: Math.floor(index / 2),
			offset,
		})
	}

	/**
	 * Searches for the item (index) nearest the specified offset.
	 *
	 * If no exact match is found the next lowest item index will be returned.
	 * This allows partially visible items (with offsets just before/above the fold) to be visible.
	 */
	_findNearestItem(offset) {
		if (isNaN(offset)) {
			throw Error(`Invalid offset ${offset} specified`)
		}

		// Our search algorithms find the nearest match at or below the specified offset.
		// So make sure the offset is at least 0 or no match will be found.
		offset = Math.max(0, offset)

		const lastMeasuredSizeAndPosition = this.getSizeAndPositionOfLastMeasuredItem()
		const lastMeasuredIndex = Math.max(0, this._lastMeasuredIndex)

		if (lastMeasuredSizeAndPosition.offset >= offset) {
			// If we've already measured items within this range just use a binary search as it's faster.
			return this._binarySearch({
				high: lastMeasuredIndex,
				low: 0,
				offset,
			})
		} else {
			// If we haven't yet measured this high, fallback to an exponential search with an inner binary search.
			// The exponential search avoids pre-computing sizes for the full set of items as a binary search would.
			// The overall complexity for this approach is O(log n).
			return this._exponentialSearch({
				index: lastMeasuredIndex,
				offset,
			})
		}
	}
}

const STYLE_INNER = "position:relative; overflow:hidden; width:100%; min-height:100%; will-change: transform;"
const STYLE_CONTENT = "position:absolute; top:0; left:0; height:100%; width:100%; overflow:visible;"

export class VirtualizedList {
	constructor(container, options) {
		this.container = container
		this.options = options

		// Initialization
		this.state = {}
		this._initializeSizeAndPositionManager(options.rowCount)

		// Binding
		this.render = this.render.bind(this)
		this.handleScroll = this.handleScroll.bind(this)

		// Lifecycle Methods
		this.componentDidMount()
	}

	componentDidMount() {
		const { onMount, initialScrollTop, initialIndex, height } = this.options
		const offset = initialScrollTop || (initialIndex != null && this.getRowOffset(initialIndex)) || 0
		const inner = (this.inner = document.createElement("div"))
		const content = (this.content = document.createElement("div"))

		inner.setAttribute("style", STYLE_INNER)
		content.setAttribute("style", STYLE_CONTENT)
		inner.appendChild(content)
		this.container.appendChild(inner)

		this.setState(
			{
				offset,
				height,
			},
			() => {
				if (offset) {
					this.container.scrollTop = offset
				}

				// Add event listeners
				this.container.addEventListener("scroll", this.handleScroll)

				if (typeof onMount === "function") {
					onMount()
				}
			}
		)
	}

	_initializeSizeAndPositionManager(count) {
		this._sizeAndPositionManager = new SizeAndPositionManager({
			itemCount: count,
			itemSizeGetter: this.getRowHeight,
			estimatedItemSize: this.options.estimatedRowHeight || 100,
		})
	}

	setState(state = {}, callback) {
		this.state = Object.assign(this.state, state)

		requestAnimationFrame(() => {
			this.render()

			if (typeof callback === "function") {
				callback()
			}
		})
	}

	resize(height, callback) {
		this.setState(
			{
				height,
			},
			callback
		)
	}

	handleScroll(e) {
		const { onScroll } = this.options
		const offset = this.container.scrollTop

		this.setState({ offset })

		if (typeof onScroll === "function") {
			onScroll(offset, e)
		}
	}

	getRowHeight = ({ index }) => {
		const { rowHeight } = this.options

		if (typeof rowHeight === "function") {
			return rowHeight(index)
		}

		return Array.isArray(rowHeight) ? rowHeight[index] : rowHeight
	}

	getRowOffset(index) {
		const sizeAndPosition = this._sizeAndPositionManager.getSizeAndPositionForIndex(index)
		let offset = 0
		if (sizeAndPosition !== undefined) {
			offset = sizeAndPosition.offset
		}
		return offset
	}

	scrollToIndex(index, alignment) {
		const { height } = this.state
		const offset = this._sizeAndPositionManager.getUpdatedOffsetForIndex({
			align: alignment,
			containerSize: height,
			targetIndex: index,
		})

		this.container.scrollTop = offset
	}

	setRowCount(count) {
		this._initializeSizeAndPositionManager(count)
		this.render()
	}

	onRowsRendered(renderedRows) {
		const { onRowsRendered } = this.options

		if (typeof onRowsRendered === "function") {
			onRowsRendered(renderedRows)
		}
	}

	destroy() {
		this.container.removeEventListener("scroll", this.handleScroll)
		this.container.innerHTML = ""
	}

	render() {
		const { overscanCount, renderRow } = this.options
		const { height, offset = 0 } = this.state
		const { start, stop } = this._sizeAndPositionManager.getVisibleRange({
			containerSize: height,
			offset,
			overscanCount,
		})
		const fragment = document.createElement("div")

		for (let index = start; index <= stop; index++) {
			fragment.appendChild(renderRow(index))
		}

		this.inner.style.height = `${this._sizeAndPositionManager.getTotalSize()}px`
		this.content.style.top = `${this.getRowOffset(start)}px`

		morphdom(this.content, fragment)

		this.onRowsRendered({
			startIndex: start,
			stopIndex: stop,
		})
	}
}
