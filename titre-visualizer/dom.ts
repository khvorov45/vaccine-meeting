export const getScrollbarWidths = () => {
	const outer = document.createElement("div")
	outer.style.visibility = "hidden"
	outer.style.overflowY = "scroll"
	document.body.appendChild(outer)

	const inner = document.createElement("div")
	outer.appendChild(inner)

	const scrollbarWidthV = outer.offsetWidth - inner.offsetWidth
	outer.removeChild(inner)

	outer.style.overflowY = "hidden"
	outer.style.overflowX = "scroll"

	outer.appendChild(inner)
	const scrollbarWidthH = outer.offsetHeight - inner.offsetHeight

	outer.parentNode!.removeChild(outer)
	return [scrollbarWidthH, scrollbarWidthV]
}

export const SCROLLBAR_WIDTHS = getScrollbarWidths()

export const createEl = document.createElement.bind(document)
export const createDiv = () => createEl("div")

export const addEl = (parent: HTMLElement, child: HTMLElement) => {
	parent.appendChild(child)
	return child
}

export const addDiv = (parent: HTMLElement) => addEl(parent, createDiv())

export const removeChildren = (el: HTMLElement) => {
	while (el.lastChild) {
		el.removeChild(el.lastChild)
	}
}

export const removeEl = (parent: HTMLElement, el: HTMLElement) => {
	parent.removeChild(el)
	return el
}

export const createDivWithText = (text: string) => {
	const div = createDiv()
	div.textContent = text
	return div
}
