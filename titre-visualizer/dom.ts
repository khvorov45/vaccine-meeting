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

type SwitchSpecBody<T> = {
	opts: T[]
	colors: { normal: string; hover: string; selected: string }
	name: string
	help?: string
	optContainerStyle?: (container: HTMLDivElement) => void
	optElementStyle?: (el: HTMLDivElement) => void
	switchElementStyle?: (el: HTMLDivElement) => void
	optElementStorage?: HTMLDivElement[]
}

const createSwitchCommon = <T>(
	spec: SwitchSpecBody<T>,
	optElementInit: (el: HTMLDivElement, opt: T, optIndex: number) => void,
	toggleOption: (event: MouseEvent, opt: T, el: HTMLDivElement, allEls: HTMLDivElement[]) => void
) => {
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
		helpText.style.whiteSpace = "pre-line"
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

	const allOptElements: HTMLDivElement[] = spec.optElementStorage ?? []
	for (let optIndex = 0; optIndex < spec.opts.length; optIndex++) {
		const opt = spec.opts[optIndex]
		const optElement = addDiv(optContainer)
		allOptElements.push(optElement)
		optElement.style.paddingTop = "5px"
		optElement.style.paddingBottom = "5px"
		optElement.style.cursor = "pointer"
		optElement.style.textAlign = "center"
		optElement.textContent = `${opt}`
		optElementInit(optElement, opt, optIndex)
		spec.optElementStyle?.(optElement)

		optElement.addEventListener("click", (event) => toggleOption(event, opt, optElement, allOptElements))
	}

	return switchElement
}

type SwitchSpecHead<T> =
	| {
			type: "toggleOneNonNullable"
			init: T
			onUpdate: (opt: T) => void
	  }
	| {
			type: "toggleMany"
			init: T[]
			onUpdate: (opt: T[]) => void
	  }
	| {
			type: "gradient"
			init: number[]
			onUpdate: (opt: T, fromLeft: number) => void
	  }

export type SwitchSpec<T> = SwitchSpecHead<T> & SwitchSpecBody<T>

export const createSwitch = <T>(spec: SwitchSpec<T>) => {
	let result: HTMLDivElement

	const optElementInitToggle = (opt: T, optElement: HTMLDivElement, isSelected: (opt: T) => boolean) => {
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
	}

	switch (spec.type) {
		case "toggleOneNonNullable":
			{
				let currentSel = spec.init
				const isSelected = (opt: T) => opt === currentSel
				const toggleOption = (
					_event: MouseEvent,
					opt: T,
					optElement: HTMLDivElement,
					allOptElements: HTMLDivElement[]
				) => {
					if (!isSelected(opt)) {
						currentSel = opt
						for (const el of allOptElements) {
							el.style.backgroundColor = spec.colors.normal
						}
						optElement.style.backgroundColor = spec.colors.selected
						spec.onUpdate(currentSel)
					}
				}
				result = createSwitchCommon(spec, (el, opt) => optElementInitToggle(opt, el, isSelected), toggleOption)
			}
			break
		case "toggleMany":
			{
				let currentSel = spec.init.map((x) => x)
				const isSelected = (opt: T) => currentSel.includes(opt)
				const toggleOption = (
					event: MouseEvent,
					opt: T,
					optElement: HTMLDivElement,
					allOptElements: HTMLDivElement[]
				) => {
					if (event.ctrlKey) {
						allOptElements.map((optEl) => (optEl.style.backgroundColor = spec.colors.normal))
						optElement.style.backgroundColor = spec.colors.selected
						currentSel = [opt]
					} else if (event.shiftKey) {
						allOptElements.map((optEl) => (optEl.style.backgroundColor = spec.colors.selected))
						currentSel = [...spec.opts]
					} else {
						if (isSelected(opt)) {
							const optIndex = currentSel.indexOf(opt)
							if (optIndex !== -1) {
								currentSel.splice(optIndex, 1)
							} else {
								console.error(`Switch opt ${opt} selected but not found in ${currentSel}`)
							}
							optElement.style.backgroundColor = spec.colors.normal
						} else {
							currentSel.push(opt)
							optElement.style.backgroundColor = spec.colors.selected
						}
					}
					spec.onUpdate(currentSel)
				}

				spec.help = spec.help === undefined ? "" : (spec.help += "\n")
				spec.help += "ctrl+click = select one\nshift+click = select all"

				result = createSwitchCommon(spec, (el, opt) => optElementInitToggle(opt, el, isSelected), toggleOption)
			}
			break
		case "gradient":
			{
				const optElementInit = (el: HTMLDivElement, _opt: T, index: number) => {
					const fromLeft = spec.init[index]
					const fromLeftPercent = Math.round(fromLeft * 100)
					el.style.background = `linear-gradient(to right, ${spec.colors.selected} ${fromLeftPercent}%, ${spec.colors.normal} ${fromLeftPercent}%)`
				}
				const toggleOption = (event: MouseEvent, opt: T, optElement: HTMLDivElement) => {
					const parent = <HTMLDivElement>event.target
					let fromLeft = event.offsetX / parent.offsetWidth
					if (event.ctrlKey) {
						fromLeft = 0
					} else if (event.shiftKey) {
						fromLeft = 1
					}
					const fromLeftPercent = Math.round(fromLeft * 100)
					optElement.style.background = `linear-gradient(to right, ${spec.colors.selected} ${fromLeftPercent}%, ${spec.colors.normal} ${fromLeftPercent}%)`
					spec.onUpdate(opt, fromLeft)
				}
				result = createSwitchCommon(spec, optElementInit, toggleOption)
			}
			break
	}

	return result
}
