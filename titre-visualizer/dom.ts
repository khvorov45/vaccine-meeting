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

export const addEl = <T1 extends HTMLElement, T2 extends HTMLElement>(parent: T1, child: T2) => {
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

type SwitchSpec<SingleOpt extends string | number> = {
	init: SingleOpt
	opts: SingleOpt[]
	onUpdate: (opt: SingleOpt) => void
	optContainerStyle?: (container: HTMLDivElement) => void
	optElementStyle?: (el: HTMLDivElement) => void
	colors: {normal: string, hover: string, selected: string}
}

export const createSwitch = <SingleOpt extends string | number>(spec: SwitchSpec<SingleOpt>) => {
	const switchElement = createDiv()
	const optContainer = addDiv(switchElement)
	spec.optContainerStyle?.(optContainer)

	let currentSel = spec.init
	const isSelected = (opt: SingleOpt) => opt === currentSel

	const allOptElements: HTMLElement[] = []

	for (let optIndex = 0; optIndex < spec.opts.length; optIndex++) {
		const opt = spec.opts[optIndex]
		const optElement = addDiv(optContainer)
		allOptElements.push(optElement)
		optElement.style.paddingTop = "5px"
		optElement.style.paddingBottom = "5px"
		optElement.style.cursor = "pointer"
		optElement.style.textAlign = "center"
		optElement.textContent = `${opt}`
		spec.optElementStyle?.(optElement)

		optElement.style.backgroundColor = isSelected(opt) ? spec.colors.selected : spec.colors.normal
		optElement.addEventListener("mouseover", () => {
			if (!isSelected(opt)) {
				optElement.style.backgroundColor = spec.colors.hover
			}
		})
		optElement.addEventListener("mouseout", () => {
			if (!isSelected(opt)) {
				optElement.style.backgroundColor = spec.colors.normal
			}
		})

		optElement.addEventListener("click", () => {
			if (opt !== currentSel) {
				for (const el of allOptElements) {
					el.style.backgroundColor = spec.colors.normal
				}
				optElement.style.backgroundColor = spec.colors.selected
				currentSel = opt
				spec.onUpdate(currentSel)
			}
		})
	}

	return switchElement
}
