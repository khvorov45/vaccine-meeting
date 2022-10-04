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
	colors: { normal: string; hover: string; selected: string }
	name: string
	help?: string
	optContainerStyle?: (container: HTMLDivElement) => void
	optElementStyle?: (el: HTMLDivElement) => void
	switchElementStyle?: (el: HTMLDivElement) => void
}

export const createSwitch = <SingleOpt extends string | number>(spec: SwitchSpec<SingleOpt>) => {
	const switchElement = createDiv()
	spec.switchElementStyle?.(switchElement)
	const optContainer = createDiv()
	spec.optContainerStyle?.(optContainer)

	const displayStyleWhenVisible = optContainer.style.display
	let optContainerDisplayed = false

	const labelContainer = addDiv(switchElement)
	labelContainer.style.display = "flex"
	labelContainer.style.justifyContent = "space-between"

	const label = addDiv(labelContainer)
	label.style.fontSize = "large"
	label.style.cursor = "pointer"
	label.style.paddingLeft = "5px"

	const setCollapse = (optContainerDisplayed: boolean) => {
		if (optContainerDisplayed) {
			optContainer.style.display = displayStyleWhenVisible
			label.textContent = spec.name + " ▲"
		} else {
			optContainer.style.display = "none"
			label.textContent = spec.name + " ▼"
		}
	}

	label.addEventListener("click", () => {
		optContainerDisplayed = !optContainerDisplayed
		setCollapse(optContainerDisplayed)
	})

	setCollapse(optContainerDisplayed)
	addEl(switchElement, optContainer)

	if (spec.help !== undefined) {
		const help = addDiv(labelContainer)
		help.textContent = "?"
		help.style.cursor = "pointer"
		help.style.paddingLeft = "10px"
		help.style.paddingRight = help.style.paddingLeft
		help.style.position = "relative"

		const helpText = addDiv(help)
		helpText.style.position = "absolute"
		helpText.style.right = "0px"
		helpText.style.backgroundColor = "var(--color-background2)"
		helpText.style.width = "150px"
		helpText.style.zIndex = "999"
		helpText.style.padding = "5px"
		addEl(helpText, createDivWithText(spec.help))
		
		const helpDisplayWhenVisible = helpText.style.display
		helpText.style.display = "none"
		help.addEventListener("click", () => {
			if (helpText.style.display === "none") {
				helpText.style.display = helpDisplayWhenVisible
			} else {
				helpText.style.display = "none"
			}
		})
	}

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
