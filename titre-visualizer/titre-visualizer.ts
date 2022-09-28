import {Papa} from "./papaparse.js"
import {VirtualizedList} from "./virtualized-list.js"
import * as Arr from "./array.ts"
import * as NestArr from "./nested_array.ts"
import * as Rand from "./rand.ts"
import * as Color from "./color.ts"

const THEMES_ = ["dark", "light"] as const
const THEMES = THEMES_ as unknown as string[]
type Theme = (typeof THEMES_)[number]

const PLOT_MODES_ = ["titres", "rises"] as const
const PLOT_MODES = PLOT_MODES_ as unknown as string[]
type PlotMode = (typeof PLOT_MODES_)[number]

const PLOT_ELEMENTS_ = ["points", "lines", "boxplots", "counts", "refLine", "means", "bars"] as const
const PLOT_ELEMENTS = PLOT_ELEMENTS_ as unknown as string[]
type PlotElement = (typeof PLOT_ELEMENTS_)[number]
type Opacities = Record<PlotElement, number>

const DATA_FORMATS_ = ["wide", "long"] as const
const DATA_FORMATS = DATA_FORMATS_ as unknown as string[]
type DataFormat = (typeof DATA_FORMATS_)[number]

//
// SECTION Math
//

type Rect = {
	l: number,
	r: number,
	t: number,
	b: number,
}

const scale = (value: number, valueMin: number, valueMax: number, scaleMin: number, scaleMax: number) => {
	let result = scaleMin
	let scaleRange = scaleMax - scaleMin
	if (scaleRange !== 0) {
		result = scaleRange / 2 + scaleMin
		let valueRange = valueMax - valueMin
		if (valueRange !== 0) {
			let value0 = value - valueMin
			let valueNorm = value0 / valueRange
			let valueScale0 = valueNorm * scaleRange
			result = valueScale0 + scaleMin
		}
	}
	return result
}

type BoxplotStats = {
	min: number,
	max: number,
	q25: number,
	median: number,
	q75: number,
	iqr: number,
	mean: number,
	meanSe: number,
	meanLow: number,
	meanHigh: number,
}

const getBoxplotStats = (arr: number[]): BoxplotStats | null => {
	let result: BoxplotStats | null = null
	if (arr.length > 0) {
		let arrSorted = arr.sort((x1, x2) => x1 - x2)
		let q25 = Arr.sortedAscQuantile(arrSorted, 0.25)
		let q75 = Arr.sortedAscQuantile(arrSorted, 0.75)
		const mean = Arr.mean(arrSorted)
		const meanSe = Arr.sd(arrSorted) / Math.sqrt(arr.length)
		result = {
			min: arrSorted[0],
			max: arrSorted[arrSorted.length - 1],
			median: Arr.sortedAscQuantile(arrSorted, 0.5),
			q25: q25,
			q75: q75,
			iqr: q75 - q25,
			mean: mean,
			meanSe: meanSe,
			meanLow: mean - 1.96 * meanSe,
			meanHigh: mean + 1.96 * meanSe,
		}
	}
	return result
}

const isGood = (n: any) => n !== null && n !== undefined && !isNaN(n)
const isString = (val: any) => (typeof val === "string" || val instanceof String)
const isNumber = (val: any) => (typeof val === "number")
const isFractional = (val: any) => isGood(val) && isNumber(val) && Math.round(val) !== val

//
// SECTION DOM
//

const getScrollbarWidths = () => {
	let outer = document.createElement('div')
	outer.style.visibility = "hidden"
	outer.style.overflowY = "scroll"
	document.body.appendChild(outer)

	let inner = document.createElement('div')
	outer.appendChild(inner)

	let scrollbarWidthV = (outer.offsetWidth - inner.offsetWidth)
	outer.removeChild(inner)

	outer.style.overflowY = "hidden"
	outer.style.overflowX = "scroll"

	outer.appendChild(inner)
	let scrollbarWidthH = outer.offsetHeight - inner.offsetHeight

	outer.parentNode!.removeChild(outer);
	return [scrollbarWidthH, scrollbarWidthV];
}

const SCROLLBAR_WIDTHS = getScrollbarWidths()

const createEl = (name: string) => document.createElement(name)
const createDiv = () => createEl("div")
const addEl = (parent: HTMLElement, child: HTMLElement) => {parent.appendChild(child); return child}
const addDiv = (parent: HTMLElement) => addEl(parent, createDiv())
const removeChildren = (el: HTMLElement) => {while (el.lastChild) {el.removeChild(el.lastChild)}}

const removeEl = (parent: HTMLElement, el: HTMLElement) => {
	parent.removeChild(el)
	return el
}

const createDivWithText = (text: string) => {
	const div = createDiv()
	div.textContent = text
	return div
}

const switchOptionStyleAllCaps = (optEl: HTMLElement, optVal: string) => {
	optEl.style.flexGrow = "1"
	optEl.style.fontWeight = "bold"
	optEl.style.letterSpacing = "2px"
	optEl.style.border = "1px solid var(--color-border)"
	optEl.textContent = optVal.toUpperCase()
}

type SwitchSpec<SingleOpt extends string | number, OptType extends SingleOpt | SingleOpt[]> = {
	init: OptType,
	opts: SingleOpt[],
	onUpdate: (opt: OptType, fromLeft?: number) => void,
	name?: string,
	optElementStyle?: (optEl: HTMLElement, optVal: SingleOpt) => void,
	optContainerStyle?: (container: HTMLElement) => void,
	optElements?: HTMLElement[],
	horizontalGradient?: number | number[],
	helpText?: string,
	singleNullable?: boolean
}

const createSwitch = <SingleOpt extends string | number, OptType extends SingleOpt | SingleOpt[]>
	(spec: SwitchSpec<SingleOpt, OptType>) => {
	const multiple = Array.isArray(spec.init)
	const collapsibleWithLabel = spec.name !== undefined

	const switchElement = createDiv()

	const optContainer = createDiv()
	spec.optContainerStyle?.(optContainer)
	let optContainerDisplayed = !collapsibleWithLabel
	let optContainerOldDisplay = optContainer.style.display
	if (!optContainerDisplayed) {
		optContainer.style.display = "none"
	}

	if (collapsibleWithLabel) {
		const labelContainer = addDiv(switchElement)
		labelContainer.style.display = "flex"
		labelContainer.style.justifyContent = "space-between"

		const label = addDiv(labelContainer)
		label.textContent = spec.name! + " ▼"
		// label.style.fontWeight = "bold"
		label.style.fontSize = "large"
		// label.style.letterSpacing = "2px"
		label.style.cursor = "pointer"
		label.style.paddingLeft = "5px"
		//label.style.textTransform = "uppercase"

		label.addEventListener("click", (event) => {
			if (optContainerDisplayed) {
				optContainerOldDisplay = optContainer.style.display
				optContainer.style.display = "none"
				label!.textContent = spec.name! + " ▼"
			} else {
				optContainer.style.display = optContainerOldDisplay
				label!.textContent = spec.name! + " ▲"
			}
			optContainerDisplayed = !optContainerDisplayed
		})

		if (spec.horizontalGradient !== undefined || multiple || spec.helpText !== undefined) {
			const help = addDiv(labelContainer)
			help.textContent = "?"
			help.style.cursor = "pointer"
			help.style.paddingLeft = "10px"
			help.style.paddingRight = help.style.paddingLeft
			help.style.position = "relative"

			const helpText = addDiv(help)
			if (spec.helpText !== undefined) {
				addEl(helpText, createDivWithText(spec.helpText))
			}
			if (spec.horizontalGradient === undefined) {
				addEl(helpText, createDivWithText("ctrl+click = select one"))
				addEl(helpText, createDivWithText("shift+click = select all"))
			} else {
				addEl(helpText, createDivWithText("ctrl+click = zero"))
				addEl(helpText, createDivWithText("shift+click = one"))
			}
			helpText.style.position = "absolute"
			helpText.style.right = "0px"
			helpText.style.backgroundColor = "var(--color-background2)"
			helpText.style.width = "150px"
			helpText.style.display = "none"
			helpText.style.zIndex = "999"
			helpText.style.padding = "5px"

			help.addEventListener("click", (event) => {
				if (helpText.style.display === "none") {
					helpText.style.display = "block"
				} else {
					helpText.style.display = "none"
				}
			})
		}
	}

	addEl(switchElement, optContainer)

	let currentSel = spec.init
	if (multiple) {
		// @ts-ignore
		currentSel = [...currentSel]
	}
	const isSelected = (opt: SingleOpt) => {
		// @ts-ignore
		let result = (!multiple && opt === currentSel) ||
			(multiple && (<SingleOpt[]>currentSel).includes(opt))
		return result
	}

	const allOptElements: HTMLElement[] = spec.optElements === undefined ? [] : spec.optElements
	for (let optIndex = 0; optIndex < spec.opts.length; optIndex++) {
		const opt = spec.opts[optIndex]
		let optElement = addDiv(optContainer)
		allOptElements.push(optElement)
		optElement.style.paddingTop = "5px"
		optElement.style.paddingBottom = "5px"
		optElement.style.cursor = "pointer"
		optElement.style.textAlign = "center"

		optElement.textContent = `${opt}`
		spec.optElementStyle?.(optElement, opt)

		let normalCol = "var(--color-background)"
		let hoverCol = "var(--color-background2)"
		let selectedCol = "var(--color-selected)"

		if (spec.horizontalGradient === undefined) {
			if (isSelected(opt)) {
				optElement.style.backgroundColor = selectedCol
			} else {
				optElement.style.backgroundColor = normalCol
			}

			optElement.addEventListener("mouseover", (event) => {
				if (!isSelected(opt)) {
					optElement.style.backgroundColor = hoverCol
				}
			})
			optElement.addEventListener("mouseout", (event) => {
				if (!isSelected(opt)) {
					optElement.style.backgroundColor = normalCol
				}
			})
		} else {
			// @ts-ignore
			const fromLeft = spec.horizontalGradient[optIndex]
			const fromLeftPercent = Math.round(fromLeft * 100)
			optElement.style.background = `linear-gradient(to right, ${selectedCol} ${fromLeftPercent}%, ${normalCol} ${fromLeftPercent}%)`
		}

		optElement.addEventListener("click", async (event) => {
			if (spec.horizontalGradient === undefined) {

				if (!multiple) {

					// @ts-ignore
					if (opt !== currentSel) {
						for (let child of optContainer.childNodes) {
							(<HTMLElement>child).style.backgroundColor = normalCol
						}
						optElement.style.backgroundColor = selectedCol
						// @ts-ignore
						currentSel = opt
					} else if (spec.singleNullable) {
						optElement.style.backgroundColor = normalCol
						//@ts-ignore
						currentSel = null
					}

				} else if (multiple) {

					if (event.ctrlKey) {
						allOptElements.map(optEl => optEl.style.backgroundColor = normalCol)
						optElement.style.backgroundColor = selectedCol;
						// @ts-ignore
						currentSel = [opt]
					} else if (event.shiftKey) {
						allOptElements.map(optEl => optEl.style.backgroundColor = selectedCol)
						// @ts-ignore
						currentSel = [...spec.opts]
					} else {
						const optIndex = (<SingleOpt[]>currentSel).indexOf(opt)
						if (optIndex) {
							optElement.style.backgroundColor = normalCol
							Arr.removeIndex(<SingleOpt[]>currentSel, optIndex)
						} else {
							optElement.style.backgroundColor = selectedCol;
							(<SingleOpt[]>currentSel).push(opt)
						}
					}
				}

				spec.onUpdate(currentSel)

			} else {
				// @ts-ignore
				let fromLeft = event.offsetX / event.target!.offsetWidth
				if (event.ctrlKey) {
					fromLeft = 0
				} else if (event.shiftKey) {
					fromLeft = 1
				}
				const fromLeftPercent = Math.round(fromLeft * 100)
				optElement.style.background = `linear-gradient(to right, ${selectedCol} ${fromLeftPercent}%, ${normalCol} ${fromLeftPercent}%)`
				// @ts-ignore
				spec.onUpdate(opt, fromLeft)
			}
		})
	}

	return switchElement
}

//
// SECTION Plots
//

const CANVAS_FONT_HEIGHT = 16
const MISSING_STRING = "(missing)"

const drawRect = (renderer: CanvasRenderingContext2D, rect: Rect, color: string) => {
	renderer.fillStyle = color
	renderer.fillRect(rect.l, rect.t, rect.r - rect.l, rect.b - rect.t)
}

const drawLine = (
	renderer: CanvasRenderingContext2D,
	x1: number, y1: number, x2: number, y2: number,
	color1: string, color2: string, thiccness: number, dashSegments: number[]
) => {
	if ((x1 !== x2 || y1 !== y2) && isGood(x1) && isGood(x2) && isGood(y1) && isGood(y2)) {
		renderer.strokeStyle = color1
		renderer.beginPath()
		renderer.moveTo(x1, y1)
		renderer.lineTo(x2, y2)
		let oldLineWidth = renderer.lineWidth
		renderer.lineWidth = thiccness

		renderer.setLineDash(dashSegments)

		renderer.stroke()

		renderer.lineWidth = oldLineWidth
		renderer.setLineDash([])
	}
}

const drawRectOutline = (renderer: CanvasRenderingContext2D, rect: Rect, color: string, thiccness: number) => {
	let halfThicc = thiccness / 2
	drawLine(renderer, rect.l - halfThicc, rect.t, rect.r + halfThicc, rect.t, color, color, thiccness, [])
	drawLine(renderer, rect.r, rect.t, rect.r, rect.b, color, color, thiccness, [])
	drawLine(renderer, rect.l - halfThicc, rect.b, rect.r + halfThicc, rect.b, color, color, thiccness, [])
	drawLine(renderer, rect.l, rect.t, rect.l, rect.b, color, color, thiccness, [])
}

const drawPoint = (
	renderer: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number,
	color: string, outlineColor: string,
) => {
	const halfr = radius / 2
	drawRect(renderer, {l: centerX - halfr, r: centerX + halfr, t: centerY - halfr, b: centerY + halfr}, color)
}

const drawDoubleLine = (
	renderer: CanvasRenderingContext2D,
	x1: number, y1: number, x2: number, y2: number,
	color: string, color2: string, thiccness: number, dashSegments: number[],
	flipShade?: boolean
) => {
	const getLineShift = (x1: number, y1: number, x2: number, y2: number, thiccness: number) => {
		let lineVec = {x: x2 - x1, y: y2 - y1}
		let linePerpVec = {x: lineVec.y, y: lineVec.x}
		let dx = linePerpVec.x / (linePerpVec.x + linePerpVec.y) * thiccness
		let dy = linePerpVec.y / (linePerpVec.x + linePerpVec.y) * thiccness
		return {dx: dx, dy: dy}
	}

	let {dx, dy} = getLineShift(x1, y1, x2, y2, thiccness)
	if (flipShade) {
		dx = -dx
		dy = -dy
	}

	drawLine(renderer, x1, y1, x2, y2, color, color, thiccness, dashSegments)
	drawLine(renderer, x1 + dx, y1 + dy, x2 + dx, y2 + dy, color2, color2, thiccness, dashSegments)
}

const drawText = (
	renderer: CanvasRenderingContext2D, text: string, xCoord: number, yCoord: number,
	color: string, angle: number, baseline: CanvasTextBaseline, textAlign: CanvasTextAlign,
	outlineColor?: string
) => {
	renderer.fillStyle = color

	renderer.textBaseline = baseline
	renderer.textAlign = textAlign
	renderer.translate(xCoord, yCoord)
	renderer.rotate(angle / 360 * 2 * Math.PI)

	renderer.font = `${CANVAS_FONT_HEIGHT}px sans-serif`
	if (outlineColor !== undefined) {
		renderer.miterLimit = 2
		renderer.lineJoin = "round"
		renderer.lineWidth = 3
		renderer.strokeStyle = outlineColor
		renderer.strokeText(text, 0, 0)
	}
	renderer.fillText(text, 0, 0)

	renderer.setTransform(1, 0, 0, 1, 0, 0)
}

type Plot = {
	canvas: HTMLCanvasElement,
	renderer: CanvasRenderingContext2D,
	spec: PlotSpec,
	scaleXToPx: (x: string | number, xFacetVal: (string | number)) => number,
	scaleScaledXToPx: (x: number, facetIndex: number) => number,
	scaleYToPx: (y: number) => number,
	scaleScaledYToPx: (y: number) => number,
	allXTicksXCoords: number[],
	allYTicksYCoords: number[],
	metrics: Rect,
	totalWidth: number,
	totalHeight: number,
	axisColor: string,
}

type PlotSpec = {
	widthTick: number,
	heightTick: number,
	scaleXData: (x: string | number, facetIndex: number) => number,
	scaleYData: (y: number) => number,
	padAxis: Rect,
	padData: Rect,
	padFacet: number,
	scaledXMinPerFacet: number[],
	scaledXMaxPerFacet: number[],
	yMin: number,
	yMax: number,
	xTicksPerFacet: (string | number)[][],
	yTicks: number[],
	xFacetVals: (string | number)[],
	xLabel: string,
	yLabel: string,
	theme: Theme,
}

const beginPlot = (spec: PlotSpec) => {

	const plotAreaWidth = spec.widthTick * spec.xTicksPerFacet.reduce((acc, cur) => acc += cur.length, 0) +
		spec.padFacet * Math.max(0, spec.xFacetVals.length - 1)
	const facetHeight = spec.heightTick * spec.yTicks.length
	const plotAreaHeight = facetHeight

	const totalWidth = plotAreaWidth + spec.padAxis.l + spec.padData.l + spec.padAxis.r + spec.padData.r
	const totalHeight = plotAreaHeight + spec.padAxis.t + spec.padData.t + spec.padAxis.b + spec.padData.b

	const canvas = <HTMLCanvasElement>createEl("canvas")
	canvas.width = totalWidth
	canvas.height = totalHeight

	const renderer = canvas.getContext("2d")!
	const bgColor = spec.theme === "dark" ? "#07090c" : "#ffffff"
	drawRect(renderer, {l: 0, t: 0, r: totalWidth, b: totalHeight}, bgColor)

	const plotMetrics: Rect = {
		t: spec.padAxis.t + spec.padData.t,
		b: totalHeight - spec.padAxis.b - spec.padData.b,
		l: spec.padAxis.l + spec.padData.l,
		r: totalWidth - spec.padAxis.r - spec.padData.r,
	}

	const xFacetMetrics: {l: number, r: number}[] = []
	if (spec.xFacetVals.length > 0) {
		let prevFacetRightAndPad = plotMetrics.l
		for (let xFacetIndex = 0; xFacetIndex < spec.xFacetVals.length; xFacetIndex++) {
			const left = prevFacetRightAndPad
			const ticksInFacet = spec.xTicksPerFacet[xFacetIndex].length
			const right = left + ticksInFacet * spec.widthTick
			xFacetMetrics.push({l: left, r: right})
			prevFacetRightAndPad = right + spec.padFacet
		}
	} else {
		xFacetMetrics[0] = {l: plotMetrics.l, r: plotMetrics.r}
	}

	const scaleScaledXToPx = (val: number, facetIndex: number) => {
		const facetMetrics = xFacetMetrics[facetIndex]
		const facetXMin = spec.scaledXMinPerFacet[facetIndex]
		const facetXMax = spec.scaledXMaxPerFacet[facetIndex]
		const result = scale(val, facetXMin, facetXMax, facetMetrics.l, facetMetrics.r,)
		return result
	}

	const scaleXToPx = (val: string | number, xFacetVal: string | number) => {
		const facetIndex = Math.max(0, spec.xFacetVals.indexOf(xFacetVal))
		const result = scaleScaledXToPx(spec.scaleXData(val, facetIndex), facetIndex)
		return result
	}

	const scaleScaledYToPx = (val: number) => {
		const result = scale(
			val, spec.scaleYData(spec.yMin), spec.scaleYData(spec.yMax),
			plotMetrics.b, plotMetrics.t,
		)
		return result
	}

	const scaleYToPx = (val: number) => {
		const result = scaleScaledYToPx(spec.scaleYData(val))
		return result
	}

	const axisThiccness = 1
	const axisCol = spec.theme === "dark" ? "#bfbdb6" : "#262524"

	// NOTE(sen) Axis lines

	drawLine(
		renderer,
		spec.padAxis.l, totalHeight - spec.padAxis.b, totalWidth - spec.padAxis.r, totalHeight - spec.padAxis.b,
		axisCol, axisCol, axisThiccness, [],
	)

	drawLine(
		renderer,
		spec.padAxis.l, totalHeight - spec.padAxis.b, spec.padAxis.l, spec.padAxis.t,
		axisCol, axisCol, axisThiccness, [],
	)

	// NOTE(sen) Axis labels

	const axisTextCol = axisCol
	drawText(
		renderer, spec.xLabel,
		(plotMetrics.r - plotMetrics.l) / 2 + plotMetrics.l, totalHeight - 3,
		axisTextCol, 0, "bottom", "center",
	)
	drawText(
		renderer, spec.yLabel,
		3, (plotMetrics.b - plotMetrics.t) / 2 + plotMetrics.t,
		axisTextCol, -90, "top", "center",
	)

	// NOTE(sen) Ticks and grid

	const tickLength = 5
	const tickToText = 5

	const allXTicksXCoords: number[] = []
	for (let xFacetIndex = 0; xFacetIndex < Math.max(1, spec.xFacetVals.length); xFacetIndex++) {
		const xFacetVal = spec.xFacetVals[xFacetIndex]
		const xFacetTicks = spec.xTicksPerFacet[xFacetIndex]

		for (let xTick of xFacetTicks) {
			const xCoord = scaleXToPx(xTick, xFacetVal)
			allXTicksXCoords.push(xCoord)
			drawLine(
				renderer,
				xCoord, totalHeight - spec.padAxis.b, xCoord, totalHeight - spec.padAxis.b + tickLength,
				axisCol, axisCol, axisThiccness, [],
			)
			drawText(
				renderer,
				`${xTick}`,
				xCoord,
				totalHeight - spec.padAxis.b + tickLength + tickToText,
				axisTextCol,
				-30,
				"hanging",
				"end",
			)
		}
	}

	const gridCol = axisCol + "22"
	const gridThiccness = 1

	const allYTicksYCoords: number[] = []
	for (let yTick of spec.yTicks) {
		let yCoord = scaleYToPx(yTick)
		allYTicksYCoords.push(yCoord)
		drawRect(
			renderer,
			{l: spec.padAxis.l - tickLength, r: spec.padAxis.l,
				t: yCoord - axisThiccness, b: yCoord},
			axisCol
		)
		drawLine(
			renderer,
			spec.padAxis.l, yCoord, totalWidth - spec.padAxis.r, yCoord,
			gridCol, gridCol, gridThiccness, [],
		)
		drawText(
			renderer,
			`${yTick}`,
			spec.padAxis.l - tickLength - tickToText,
			yCoord,
			axisTextCol,
			0,
			"middle",
			"end",
		)
	}

	// NOTE(sen) Facet labels and separators
	const facetSepColor = axisCol + Color.channel255ToString(0.4)
	for (let xFacetIndex = 0; xFacetIndex < spec.xFacetVals.length; xFacetIndex++) {
		const xFacetVal = spec.xFacetVals[xFacetIndex]
		const metrics = xFacetMetrics[xFacetIndex]
		const facetCenter = (metrics.r + metrics.l) / 2
		const facetGap = metrics.r + spec.padFacet / 2

		const yOffset = xFacetIndex % 2 === 0 ? 5 : 5 + CANVAS_FONT_HEIGHT
		const sepThiccness = 2
		drawText(renderer, `${xFacetVal ?? MISSING_STRING}`, facetCenter, yOffset, axisTextCol, 0, "top", "center")
		if (xFacetIndex < spec.xFacetVals.length - 1) {
			drawLine(
				renderer, facetGap, yOffset, facetGap, totalHeight - spec.padAxis.b - axisThiccness,
				facetSepColor, facetSepColor, sepThiccness, [],
			)
		}
	}

	const result: Plot = {
		canvas: canvas, renderer: renderer, spec: spec,
		scaleXToPx: scaleXToPx, scaleYToPx: scaleYToPx,
		scaleScaledXToPx: scaleScaledXToPx, scaleScaledYToPx: scaleScaledYToPx,
		allXTicksXCoords: allXTicksXCoords, allYTicksYCoords: allYTicksYCoords,
		metrics: plotMetrics,
		totalWidth: totalWidth,
		totalHeight: totalHeight,
		axisColor: axisCol,
	}

	return result
}

const addBoxplot = (
	plot: Plot,
	stats: BoxplotStats,
	xCoord: number,
	totalBoxWidth: number,
	baseColor: string,
	baseAltColor: string,
	lineThiccness: number,
	boxesAlpha: number,
	meansAlpha: number,
) => {

	totalBoxWidth = Math.max(totalBoxWidth, 0)
	let boxWidth = totalBoxWidth * 3 / 4
	let medianChonkiness = boxWidth / 4

	let boxLeft = xCoord - boxWidth
	let boxRight = xCoord
	const boxCenter = xCoord - boxWidth / 2

	let boxplotBody = {l: boxLeft, b: plot.scaleScaledYToPx(stats.q25), r: boxRight, t: plot.scaleScaledYToPx(stats.q75)}

	// NOTE(sen) Boxes
	{
		const alphaStr = Color.channel255ToString(boxesAlpha)
		const color = baseColor + alphaStr
		const altColor = baseAltColor + alphaStr
		drawRectOutline(plot.renderer, boxplotBody, color, lineThiccness)

		const bodyOutline: Rect = {l: boxplotBody.l + lineThiccness, r: boxplotBody.r - lineThiccness, t: boxplotBody.t + lineThiccness, b: boxplotBody.b - lineThiccness}
		drawRectOutline(plot.renderer, bodyOutline, altColor, lineThiccness)

		drawDoubleLine(
			plot.renderer,
			xCoord,
			plot.scaleScaledYToPx(stats.q75),
			xCoord,
			Math.max(plot.scaleScaledYToPx(stats.max), plot.metrics.t),
			color,
			altColor,
			lineThiccness,
			[],
			true,
		)

		drawDoubleLine(
			plot.renderer,
			xCoord,
			Math.min(plot.scaleScaledYToPx(stats.min), plot.metrics.b),
			xCoord,
			plot.scaleScaledYToPx(stats.q25),
			color,
			altColor,
			lineThiccness,
			[],
			true,
		)

		// NOTE(sen) Median
		const medianYCoord = plot.scaleScaledYToPx(stats.median)
		drawDoubleLine(
			plot.renderer,
			boxLeft - medianChonkiness,
			medianYCoord,
			boxRight,
			medianYCoord,
			color,
			altColor,
			lineThiccness,
			[]
		)
	}

	// NOTE(sen) Means
	{
		const alphaStr = Color.channel255ToString(meansAlpha)
		const color = baseColor + alphaStr
		const altColor = baseAltColor + alphaStr

		drawDoubleLine(
			plot.renderer,
			boxCenter,
			plot.scaleScaledYToPx(stats.meanLow),
			boxCenter,
			plot.scaleScaledYToPx(stats.meanHigh),
			color,
			altColor,
			lineThiccness,
			[]
		)
		drawPoint(plot.renderer, boxCenter, plot.scaleScaledYToPx(stats.mean), 5, color, altColor)
	}
}

const addVBar = (
	plot: Plot,
	topYCoord: number,
	xCoord: number,
	width: number,
	color: string,
	alpha: number,
) => {
	const halfWidth = width / 2

	drawRect(
		plot.renderer,
		{l: xCoord - halfWidth, r: xCoord + halfWidth, t: topYCoord, b: plot.metrics.b},
		color + Color.channel255ToString(alpha)
	)
}

const virusSort = (v1: string, v2: string) => {
	let result = 0

	if (v1.startsWith("A") && v2.startsWith("B")) {
		result = -1
	} else if (v2.startsWith("A") && v1.startsWith("B")) {
		result = 1
	}

	if (result === 0) {
		let yearPat = /(\d{4})e?$/
		let year1 = yearPat.exec(v1)?.[1]
		let year2 = yearPat.exec(v2)?.[1]
		if (year1 !== undefined && year2 !== undefined) {
			result = parseInt(year1) - parseInt(year2)
		}
	}

	if (result === 0) {
		if (v1 > v2) {
			result = 1
		} else {
			result = -1
		}
	}

	return result
}

const getSorter = (varName: string, varNames: DataVarNames) => varName === varNames.virus ? virusSort : Arr.generalSort

type PlotSettings = {
	xFacets: string[],
	xAxis: string,
	refTitre: number,
	refRatio: number,
	refRelative: number,
	theme: Theme,
	opacities: Opacities,
	kind: PlotMode,
	relative: boolean,
	refVirus: string,
	refType: "manual" | "data",
}

const FACET_LABEL_SEP = "; "

const createPlot = (data: Data, settings: PlotSettings, boxplotData: any[]) => {

	const xFacetValsAll = NestArr.expandGrid(settings.xFacets.map(xFacet => Arr.unique(data.dataFiltered.map(row => row[xFacet] as any)).sort(getSorter(xFacet, data.varNames)))).map((vals: any) => vals.join(FACET_LABEL_SEP))
	const xFacetVals: string[] = []
	const xTicksPerFacet = xFacetValsAll.length > 0 ? xFacetValsAll.map((xFacetVal: any) => {
		const dataFacet = data.dataFiltered.filter(row => row.__XFACET__ === xFacetVal)
		const facetXTicks = Arr.unique(dataFacet.map(row => row[settings.xAxis] as any)).sort(getSorter(settings.xAxis, data.varNames))
		if (dataFacet.length > 0) {
			xFacetVals.push(xFacetVal)
		}
		return facetXTicks
	}).filter((arr: any) => arr.length > 0) : [Arr.unique(data.dataFiltered.map(row => row[settings.xAxis] as any)).sort(getSorter(settings.xAxis, data.varNames))]

	const referenceTitres: Record<string, {pre: number | null, post: number | null}> = {}
	const pidVirusTimepointTitres: Record<string, Record<string, {pre: number | null, post: number | null}>> = {}
	if (settings.relative) {
		const allpids = Arr.unique(data.dataFull.map(row => row.__UNIQUEPID__))
		for (let pid of allpids) {
			const pidData = data.dataFull.filter(row => row.__UNIQUEPID__ === pid)
			const viruses = Arr.unique(pidData.map(row => row[data.varNames.virus]))
			pidVirusTimepointTitres[pid] = {}
			for (let virus of viruses) {
				pidVirusTimepointTitres[pid][virus] = {pre: null, post: null}
				const pidVirusData = pidData.filter(row => row[data.varNames.virus] == virus)
				let preTitres = []
				let postTitres = []
				const varNames = data.varNames
				switch (varNames.format) {
					case "long": {
						preTitres = pidVirusData.filter(row => row[varNames.timepoint] == varNames.timepointLabels.pre).map(row => row[varNames.titre])
						postTitres = pidVirusData.filter(row => row[varNames.timepoint] == varNames.timepointLabels.post).map(row => row[varNames.titre])
					} break
					case "wide": {
						preTitres = pidVirusData.map(row => row[varNames.preTitre])
						postTitres = pidVirusData.map(row => row[varNames.postTitre])
					} break
				}
				// TODO(sen) Some sort of warining here when length > 1
				// that we couldn't uniquely identify an individual
				if (preTitres.length === 1) {pidVirusTimepointTitres[pid][virus].pre = <number>preTitres[0]}
				if (postTitres.length === 1) {pidVirusTimepointTitres[pid][virus].post = <number>postTitres[0]}
			}
			const pidReferenceTitres = pidData.filter(row => row[data.varNames.virus] === settings.refVirus)
			let preTitres = []
			let postTitres = []
			const varNames = data.varNames
			switch (varNames.format) {
				case "long": {
					preTitres = pidReferenceTitres.filter(row => row[varNames.timepoint] == varNames.timepointLabels.pre).map(row => row[varNames.titre])
					postTitres = pidReferenceTitres.filter(row => row[varNames.timepoint] == varNames.timepointLabels.post).map(row => row[varNames.titre])
				} break
				case "wide": {
					preTitres = pidReferenceTitres.map(row => row[varNames.preTitre])
					postTitres = pidReferenceTitres.map(row => row[varNames.postTitre])
				} break
			}
			referenceTitres[pid] = {pre: null, post: null}
			// TODO(sen) Some sort of warining here when length > 1
			// that we couldn't uniquely identify an individual
			if (preTitres.length === 1) {referenceTitres[pid].pre = <number>preTitres[0]}
			if (postTitres.length === 1) {referenceTitres[pid].post = <number>postTitres[0]}
		}
	}

	const plot = beginPlot({
		widthTick: 50,
		heightTick: 30,
		scaleXData: (xVal, xFacetIndex) => xTicksPerFacet[xFacetIndex].indexOf(xVal),
		scaleYData: settings.relative ? (x) => x : Math.log,
		padAxis: {l: 100, t: 50, r: 50, b: 150},
		padData: {l: 40, t: 20, r: 40, b: 20},
		padFacet: 80,
		scaledXMinPerFacet: xTicksPerFacet.map((ticks: any) => 0),
		scaledXMaxPerFacet: xTicksPerFacet.map((ticks: any) => ticks.length - 1),
		yMin: settings.relative ? 0 : settings.kind === "titres" ? 5 : 0.25,
		yMax: settings.relative ? 5 : settings.kind === "titres" ? 5120 : 256,
		xTicksPerFacet: xTicksPerFacet,
		yTicks: settings.relative ? [0, 0.5, 1, 2, 3, 4, 5] : settings.kind === "titres" ? [5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120] :
			[0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256],
		xFacetVals: xFacetVals,
		xLabel: "",
		yLabel: settings.kind === "titres" ? "Titre" : "Rises",
		theme: settings.theme,
	})

	// NOTE(sen) Reference line
	{
		const yCoord = plot.scaleYToPx(settings.relative ? settings.refRelative : settings.kind === "titres" ? settings.refTitre : settings.refRatio)
		const color = plot.axisColor + Color.channel255ToString(settings.opacities.refLine)
		const thickness = 1
		drawLine(plot.renderer, plot.spec.padAxis.l, yCoord, plot.totalWidth - plot.spec.padAxis.r, yCoord, color, color, thickness, [])
	}

	for (let xFacetIndex = 0; xFacetIndex < Math.max(xFacetVals.length, 1); xFacetIndex++) {
		const xFacetVal = xFacetVals[xFacetIndex]
		const xTicksForFacet = xTicksPerFacet[xFacetIndex]

		for (let xTick of xTicksForFacet) {
			const stripData = data.dataFiltered.filter(row => {
                let result = row[settings.xAxis] === xTick
				if (settings.xFacets.length > 0) {
					result = result && row.__XFACET__ === xFacetVal
				}

				const varNames = data.varNames
				switch (varNames.format) {
				case "long": {
					result = result && isGood(row[varNames.titre])
				} break
				case "wide": {
					result = result && isGood(row[varNames.preTitre]) && isGood(row[varNames.postTitre])
				} break
				}

				return result
            })
			const pids = Arr.unique(stripData.map(row => row.__UNIQUEPID__))
			const stripXCoord = plot.scaleXToPx(xTick, xFacetVal)

			const leftRightStep = plot.spec.widthTick / 4
			const preColor = "#308A36"
			const postColor = "#7FA438"

			const preXCoord = stripXCoord - leftRightStep
			const postXCoord = stripXCoord + leftRightStep

			const pointSize = 2
			const lineSize = 1
			const pointAlphaStr = Color.channel255ToString(settings.opacities.points)
			const lineAlphaStr = Color.channel255ToString(settings.opacities.lines)
			const preColorWithAlpha = preColor + pointAlphaStr
			const postColorWithAlpha = postColor + pointAlphaStr
			const preColorWithAlphaLine = preColor + lineAlphaStr
			const postColorWithAlphaLine = postColor + lineAlphaStr

			const adjacentDistance = plot.spec.widthTick - leftRightStep * 2
			const jitterMaxX = adjacentDistance / 4
			const jitterMaxY = plot.spec.heightTick / 4

			// NOTE(sen) Points and lines connecting them
			let scaledPreTitres: number[] = []
			let scaledPostTitres: number[] = []
			const scaledRatios: number[] = []
			const varNames = data.varNames
			switch (varNames.format) {
			case "long": {
				const preData = stripData.filter(row => row[varNames.timepoint] === varNames.timepointLabels.pre)
				const postData = stripData.filter(row => row[varNames.timepoint] === varNames.timepointLabels.post)
				for (let pid of pids) {
					const pre = preData.filter(row => row.__UNIQUEPID__ === pid)
					const post = postData.filter(row => row.__UNIQUEPID__ === pid)
					const refViruses = Arr.unique(Arr.unique(pre.map(row => row[data.varNames.reference])).concat(Arr.unique(post.map(row => row[data.varNames.reference]))))

					let preTitres = pre.map(row => row[varNames.titre] as number)
					let postTitres = post.map(row => row[varNames.titre] as number)
					if (settings.relative) {
						if (settings.refType === "manual" || refViruses.length === 1) {
							let reference = referenceTitres[pid]
							if (settings.refType == "data") {
								const refVirus = refViruses[0]
								reference = pidVirusTimepointTitres[pid][refVirus]
							}
							if (reference !== undefined) {
								if (reference.pre !== null) {
									preTitres = preTitres.map(titre => titre / <number>reference.pre)
								} else {
									preTitres = []
								}

								if (reference.post !== null) {
									postTitres = postTitres.map(titre => titre / <number>reference.post)
								} else {
									postTitres = []
								}
							} else {
								preTitres = []
								postTitres = []
							}
						} else {
							preTitres = []
							postTitres = []
						}
					}

					const jitterX = Rand.unif(-jitterMaxX, jitterMaxX)
					const jitterY = Rand.unif(-jitterMaxY, jitterMaxY)

					if (settings.kind === "titres") {
						const preXCoordJit = preXCoord + jitterX
						const postXCoordJit = postXCoord + jitterX

						const preYTitresScaled = preTitres.map(titre => plot.spec.scaleYData(titre))
						const postYTitresScaled = postTitres.map(titre => plot.spec.scaleYData(titre))

						scaledPreTitres = scaledPreTitres.concat(preYTitresScaled)
						scaledPostTitres = scaledPostTitres.concat(postYTitresScaled)

						const preYCoords = preYTitresScaled.map(titre => plot.scaleScaledYToPx(titre) + jitterY)
						const postYCoords = postYTitresScaled.map(titre => plot.scaleScaledYToPx(titre) + jitterY)

						for (let preYCoord of preYCoords) {
							drawPoint(plot.renderer, preXCoordJit, preYCoord, pointSize, preColorWithAlpha, preColorWithAlpha)
						}
						for (let postYCoord of postYCoords) {
							drawPoint(plot.renderer, postXCoordJit, postYCoord, pointSize, postColorWithAlpha, postColorWithAlpha)
						}

						if (preYCoords.length === 1 && postYCoords.length === 1) {
							drawLine(plot.renderer, preXCoordJit, preYCoords[0], postXCoordJit, postYCoords[0], preColorWithAlphaLine, postColorWithAlphaLine, lineSize, [])
						}
					} else if (preTitres.length === 1 && postTitres.length === 1) {
						const scaledRatio = plot.spec.scaleYData(postTitres[0] / preTitres[0])
						scaledRatios.push(scaledRatio)
						const yCoord = plot.scaleScaledYToPx(scaledRatio) + jitterY
						drawPoint(plot.renderer, stripXCoord + jitterX, yCoord, pointSize, preColorWithAlpha, preColorWithAlpha)
					}
				}
			} break

			case "wide": {
				for (let pid of pids) {
					const pidData = stripData.filter(row => row.__UNIQUEPID__ === pid)
					const refViruses = Arr.unique(pidData.map(row => row[data.varNames.reference]))
					for (let row of pidData) {
						let preTitre: number | null = <number>row[varNames.preTitre]
						let postTitre: number | null = <number>row[varNames.postTitre]
	
						// TODO(sen) Clip plot elements to plot area
	
						if (settings.relative) {
							if (settings.refType === "manual" || refViruses.length === 1) {
								let reference = referenceTitres[pid]
								if (settings.refType == "data") {
									const refVirus = refViruses[0]
									reference = pidVirusTimepointTitres[pid][refVirus]
								}
								if (reference !== undefined) {
									if (reference.pre !== null) {
										preTitre = preTitre / <number>reference.pre
									} else {
										preTitre = null
									}
	
									if (reference.post !== null) {
										postTitre = postTitre / <number>reference.post
									} else {
										postTitre = null
									}
								} else {
									preTitre = null
									postTitre = null
								}
							} else {
								preTitre = null
								postTitre = null
							}
						}

						const jitterX = Rand.unif(-jitterMaxX, jitterMaxX)
						const jitterY = Rand.unif(-jitterMaxY, jitterMaxY)
						
						if (settings.kind === "titres") {

							let preXCoordJit = 0
							let preYCoordJit = 0
							if (isGood(preTitre)) {
								const scaledPreTitre = plot.spec.scaleYData(<number>preTitre)
								scaledPreTitres.push(scaledPreTitre)
								const preYCoord = plot.scaleScaledYToPx(scaledPreTitre)
								preXCoordJit = preXCoord + jitterX
								preYCoordJit = preYCoord + jitterY
								drawPoint(plot.renderer, preXCoordJit, preYCoordJit, pointSize, preColorWithAlpha, preColorWithAlpha)
							}

							let postXCoordJit = 0
							let postYCoordJit = 0
							if (isGood(postTitre)) {
								const scaledPostTitre = plot.spec.scaleYData(<number>postTitre)
								scaledPostTitres.push(scaledPostTitre)
								const postYCoord = plot.scaleScaledYToPx(scaledPostTitre)
								postXCoordJit = postXCoord + jitterX
								postYCoordJit = postYCoord + jitterY
								drawPoint(plot.renderer, postXCoordJit, postYCoordJit, pointSize, postColorWithAlpha, postColorWithAlpha)
							}
	
							if (isGood(preTitre) && isGood(postTitre)) {
								drawLine(plot.renderer, preXCoordJit, preYCoordJit, postXCoordJit, postYCoordJit, preColorWithAlphaLine, postColorWithAlphaLine, lineSize, [])
							}
						} else if (isGood(preTitre) && isGood(postTitre)) {
							const scaledRatio = plot.spec.scaleYData(<number>postTitre / <number>preTitre)
							scaledRatios.push(scaledRatio)
							const yCoord = plot.scaleScaledYToPx(scaledRatio) + jitterY
							drawPoint(plot.renderer, stripXCoord + jitterX, yCoord, pointSize, preColorWithAlpha, preColorWithAlpha)
						}
					}
				}
			} break
			}

			const altColor = settings.theme === "dark" ? "#000000" : "#ffffff"

			// NOTE(sen) Boxplots
			const boxWidth = leftRightStep
			const boxLineThiccness = 2

			const addVarsToBoxplotStats = (stats: BoxplotStats) => {
				const statsMod = stats as any
				const splitFacetVal = xFacetVal.split(FACET_LABEL_SEP)
				for (let xFacetVarIndex = 0; xFacetVarIndex < settings.xFacets.length; xFacetVarIndex++) {
					statsMod[settings.xFacets[xFacetVarIndex]] = splitFacetVal[xFacetVarIndex]
				}
				statsMod.xFacetVal = xFacetVal
				statsMod.xTick = xTick
			}

			const boxPreXCoord = scaledPostTitres.length === 0 ? stripXCoord : preXCoord
			const boxPostXCoord = scaledPreTitres.length === 0 ? stripXCoord : postXCoord

			if (settings.kind === "titres") {
				const preStats = getBoxplotStats(scaledPreTitres)
				const postStats = getBoxplotStats(scaledPostTitres)

				if (preStats !== null) {
					addVBar(
						plot, plot.scaleScaledYToPx(preStats.mean),
						boxPreXCoord, boxWidth, preColor, settings.opacities.bars
					)

					addBoxplot(
						plot, preStats, boxPreXCoord, boxWidth,
						preColor, altColor, boxLineThiccness,
						settings.opacities.boxplots, settings.opacities.means,
					)
					addVarsToBoxplotStats(preStats)
					;(<any>preStats).timepoint = "pre"
					boxplotData.push(preStats)
				}

				if (postStats !== null) {
					addVBar(
						plot, plot.scaleScaledYToPx(postStats.mean),
						boxPostXCoord, boxWidth, postColor, settings.opacities.bars
					)

					addBoxplot(
						plot, postStats, boxPostXCoord, boxWidth,
						postColor, altColor, boxLineThiccness,
						settings.opacities.boxplots, settings.opacities.means,
					)
					addVarsToBoxplotStats(postStats)
					;(<any>postStats).timepoint = "post"
					boxplotData.push(postStats)
				}

			} else if (scaledRatios.length > 0) {

				const ratioStats = getBoxplotStats(scaledRatios)
				if (ratioStats !== null) {
					addVBar(
						plot, plot.scaleScaledYToPx(ratioStats.mean),
						stripXCoord, boxWidth, preColor, settings.opacities.bars
					)
					addBoxplot(
						plot, ratioStats, stripXCoord, boxWidth,
						preColor, altColor, boxLineThiccness,
						settings.opacities.boxplots, settings.opacities.means,
					)
					addVarsToBoxplotStats(ratioStats)
					boxplotData.push(ratioStats)
				}
			}

			// NOTE(sen) Counts
			{
				const yCoord = plot.scaleYToPx(plot.spec.yTicks[plot.spec.yTicks.length - 1])
				const alphaStr = Color.channel255ToString(settings.opacities.counts)

				if (settings.kind === "titres") {

					if (scaledPreTitres.length > 0) {
						drawText(
							plot.renderer, `${scaledPreTitres.length}`,
							boxPreXCoord,
							yCoord,
							preColor + alphaStr, -90, "middle", "center", altColor + alphaStr,
						)
					}

					if (scaledPostTitres.length > 0) {
						drawText(
							plot.renderer, `${scaledPostTitres.length}`,
							boxPostXCoord,
							yCoord,
							postColor + alphaStr, -90, "middle", "center", altColor + alphaStr,
						)
					}
				} else if (scaledRatios.length > 0) {
					drawText(
						plot.renderer, `${scaledRatios.length}`,
						stripXCoord,
						yCoord,
						preColor + alphaStr, -90, "middle", "center", altColor + alphaStr,
					)
				}
			}
		}
	}

	return plot
}

//
// SECTION Tables
//

const TABLE_ROW_HEIGHT_PX = 30
const DOWNLOAD_CSV: { [key: string]: string } = {}

let globalResizeListeners: any[] = []

const createTableFilterRow = <T>(colSpec: {[key: string]: TableColSpecFinal<T>}, onInput: any) => {
	let filterRow = createDiv()
	applyTableHeaderRowStyle(filterRow)

	let rowWidth = 0 //SCROLLBAR_WIDTHS[1]
	let colnameIndex = 0
	for (let colname of Object.keys(colSpec)) {
		let colWidthPx = colSpec[colname].width
		rowWidth += colWidthPx
		let cellContainer = addDiv(filterRow)
		applyCellContainerStyle(cellContainer, colWidthPx)
		cellContainer.style.position = "relative"

		let questionMarkWidth = 20

		let cell = <HTMLInputElement>addEl(cellContainer, createEl("input"))
		cell.type = "text"
        cell.autocomplete = "off"
        cell.placeholder = "Filter..."
		cell.style.width = (colWidthPx - questionMarkWidth) + "px"
		cell.style.boxSizing = "border-box"
		cell.addEventListener("input", (event) => {
			onInput(colname, (<HTMLTextAreaElement>event.target).value)
		})

		let questionMark = addDiv(cellContainer)
		questionMark.style.padding = "2px"
		questionMark.style.width = questionMarkWidth + "px"
		questionMark.style.textAlign = "center"
		questionMark.style.cursor = "pointer"
		questionMark.textContent = "?"

        let helpText = "Case-sensitive. Supports regular expressions (e.g. ^male). For numbers, you can type >x and <x (e.g. >40)"
        let helpEl = createDiv()
        helpEl.textContent = helpText
        helpEl.style.position = "absolute"
        helpEl.style.top = "100%"
        helpEl.style.backgroundColor = "var(--color-background2)"
        helpEl.style.padding = "10px"
        helpEl.style.width = "200px"
        helpEl.style.border = "1px solid var(--color-border)"
        helpEl.style.zIndex = "999"
        helpEl.style.whiteSpace = "normal"

        if (colnameIndex == 0) {
        	helpEl.style.left = "0px"
        }
		if (colnameIndex == Object.keys(colSpec).length - 1) {
        	helpEl.style.right = "0px"
        }

        let helpVisible = false
        questionMark.addEventListener("click", () => {
        	if (helpVisible) {
        		removeEl(cellContainer, helpEl)
        	} else {
        		addEl(cellContainer, helpEl)
        	}
        	helpVisible = !helpVisible
        })

        colnameIndex += 1
	}

	filterRow.style.width = rowWidth + "px"
	return filterRow
}

const applyTableHeaderRowStyle = (node: HTMLElement) => {
	node.style.display = "flex"
	node.style.height = TABLE_ROW_HEIGHT_PX + "px"
	node.style.backgroundColor = "var(--color-background2)"
	//node.style.borderLeft = "1px solid var(--color-border)"
	//node.style.borderRight = "1px solid var(--color-border)"
	node.style.boxSizing = "border-box"
}

const applyCellContainerStyle = (node: HTMLElement, width: number) => {
	node.style.display = "flex"
	node.style.width = width.toFixed(0) + "px"
	node.style.alignItems = "center"
	node.style.justifyContent = "center"
	node.style.whiteSpace = "nowrap"
}

const createTableHeaderRow = <T>(colSpec: {[key: string]: TableColSpecFinal<T>}) => {
	let headerRow = createDiv()
	applyTableHeaderRowStyle(headerRow)

	let rowWidth = 0 //SCROLLBAR_WIDTHS[1]
	for (let colname of Object.keys(colSpec)) {
		let colWidthPx = colSpec[colname].width
		rowWidth += colWidthPx
		let cell = addDiv(headerRow)
		applyCellContainerStyle(cell, colWidthPx)
		cell.textContent = colname
	}

	headerRow.style.width = rowWidth + "px"
	return headerRow
}

const createTableCell = (widthPx: number) => {
	let cellElement = createEl("td")
	cellElement.style.width = widthPx + "px"
	cellElement.style.textAlign = "center"
	cellElement.style.verticalAlign = "middle"
	cellElement.style.whiteSpace = "nowrap"
	return cellElement
}

const createTableCellString = (widthPx: number, string: string) => {
	let cellElement = createTableCell(widthPx)
	cellElement.textContent = string
	if (string === MISSING_STRING) {
		cellElement.style.color = "var(--color-text-muted)"
	}
	return cellElement
}

const createTableTitle = (title: string, downloadable: boolean) => {
	let titleElement = createDiv()
	titleElement.style.display = "flex"
	titleElement.style.alignItems = "center"
	titleElement.style.justifyContent = "center"
	titleElement.style.backgroundColor = "var(--color-background2)"
	titleElement.style.height = TABLE_ROW_HEIGHT_PX + "px"
	titleElement.style.border = "1px solid var(--color-border)"
	titleElement.style.boxSizing = "border-box"
	titleElement.style.whiteSpace = "nowrap"
	titleElement.textContent = title

	if (downloadable) {
		titleElement.style.cursor = "pointer"
		titleElement.textContent += " ⇓ (download)"

		titleElement.addEventListener("click", (event) => {
			let csv = DOWNLOAD_CSV[title]
			if (csv) {
				let hidden = <HTMLLinkElement>createEl("a")
				hidden.href = "data:text/csv;charset=utf-8," + encodeURI(csv)
				hidden.target = "_blank"
				// @ts-ignore
				hidden.download = title + ".csv"
				hidden.click()
			} else {
				console.error(`table '${title}' does not have a csv to download`)
			}
		})
	}

	return titleElement
}

const getTableBodyHeight = (tableHeight: number) => {
	let result = tableHeight - TABLE_ROW_HEIGHT_PX * 3
	return result
}

const createTableBodyContainer = (tableHeight: number) => {
	let tableBodyContainer = createDiv()
	tableBodyContainer.style.overflowY = "scroll"
	tableBodyContainer.style.maxHeight = getTableBodyHeight(tableHeight) + "px"
	tableBodyContainer.style.boxSizing = "border-box"
	return tableBodyContainer
}

const getTableRowBackgroundColor = (rowIndex: number) => {
	let result = "var(--color-background)"
	if (rowIndex % 2 == 1) {
		result = "var(--color-background2)"
	}
	return result
}

const createTableDataRow = (rowIndex: number) => {
	let rowElement = createEl("tr")
	rowElement.style.height = TABLE_ROW_HEIGHT_PX + "px"
	rowElement.style.backgroundColor = getTableRowBackgroundColor(rowIndex)
	return rowElement
}

type TableColSpec<RowType> = {
	access?: ((row: RowType) => any) | string,
	format?: (val: any) => string,
	width?: number,
	filter?: (row: RowType, val: any) => boolean,
	filterValProcess?: (val: string) => string,
}

type TableColSpecFinal<RowType> = {
	access: (row: RowType) => any,
	format: (val: any) => string,
	width: number,
	filter: (row: RowType, val: string) => boolean,
	filterVal: string,
	filterValProcess: (val: string) => string,
}

const createTableElementFromAos = <RowType extends { [key: string]: any }>(
	{aos, colSpecInit, defaults, title, forRow, getTableHeightInit, onFilterChange}: {
		aos: RowType[],
		colSpecInit: { [key: string]: TableColSpec<RowType> },
		title: string,
		defaults?: TableColSpec<RowType>,
		forRow?: (row: RowType) => void,
		getTableHeightInit?: () => number,
		onFilterChange?: (filteredData: RowType[]) => void,
	}
) => {

	let getTableHeight = getTableHeightInit ?? (() => window.innerHeight - SCROLLBAR_WIDTHS[0])

	let table = createDiv()
	table.style.maxWidth = "100%"
	addEl(table, createTableTitle(title, true))
	DOWNLOAD_CSV[title] = ""

	let colnames = Object.keys(colSpecInit)
	DOWNLOAD_CSV[title] += colnames.join(",") + "\n"

	// NOTE(sen) Fill in missing spec entries
	let colSpec: { [key: string]: TableColSpecFinal<RowType> } = {}
	for (let colname of colnames) {
		let specInit = colSpecInit[colname]

		let accessInit = specInit.access ?? defaults?.access ?? colname
		if (isString(accessInit)) {
			let colname = <string>accessInit
			accessInit = (rowData) => rowData[colname]
		}

		let access = <(row: RowType) => any>accessInit
		let format = (x: any) => {
			let result = MISSING_STRING
			if (x !== undefined && x !== null && x !== "undefined") {
				let formatTest = specInit.format ?? defaults?.format
				if (formatTest !== undefined && formatTest !== null) {
					result = formatTest(x)
				} else {
					result = `${x}`
				}
			}
			return result
		}

		colSpec[colname] = {
			access: access,
			format: format,
			width: specInit.width ?? defaults?.width ?? 100,
			filter: specInit.filter ?? defaults?.filter ?? ((row, val) => {
				let data = access(row)
				let formattedData = format(data)
				let passed = true

				if ((val.startsWith(">") || val.startsWith("<")) && isNumber(data)) {
					let valNumber = parseFloat(val.slice(1))
					if (!isNaN(valNumber)) {
						switch (val[0]) {
						case ">": {passed = data >= valNumber} break;
						case "<": {passed = data <= valNumber} break;
						}
					}
				} else {
					try {
						let re = new RegExp(val)
						let reResult = formattedData.search(re)
						passed = reResult !== -1
					} catch (e) {
						passed = formattedData.includes(val)
					}
				}

				return passed
			}),
			filterVal: "",
			filterValProcess: specInit.filterValProcess ?? defaults?.filterValProcess ?? ((x) => x),
		}
	}

	let tableWidthPx = 0
	for (let colname of colnames) {
		tableWidthPx += colSpec[colname].width
	}

	let regenBody = () => {}

	if (aos.length > 0) {

		let hscrollContainer = addDiv(table)
		hscrollContainer.style.overflowX = "scroll"
		hscrollContainer.style.boxSizing = "border-box"
		hscrollContainer.style.borderLeft = "1px solid var(--color-border)"
		hscrollContainer.style.borderRight = "1px solid var(--color-border)"

		addEl(hscrollContainer, createTableHeaderRow(colSpec))
		addEl(hscrollContainer, createTableFilterRow(colSpec, (colname: string, filterVal: any) => {
			colSpec[colname].filterVal = colSpec[colname].filterValProcess(filterVal)
			aosFiltered = getAosFiltered()
			virtualizedList.setRowCount(aosFiltered.length)
		}))

		let tableBodyHeight = getTableBodyHeight(getTableHeight())
		let tableBodyContainer = addEl(hscrollContainer, createTableBodyContainer(getTableHeight()))
		tableBodyContainer.style.width = tableWidthPx + "px"

		const getAosFiltered = () => {
			let aosFiltered: RowType[] = []
			for (let rowIndex = 0; rowIndex < aos.length; rowIndex += 1) {
				let rowData = aos[rowIndex]

				let passedColFilters = true
				for (let otherColname of colnames) {
					let spec = colSpec[otherColname]
					passedColFilters = passedColFilters && spec.filter(rowData, spec.filterVal)
				}

				if (passedColFilters) {
					aosFiltered.push(rowData)
				}
			}
			onFilterChange?.(aosFiltered)
			return aosFiltered
		}

		let aosFiltered = getAosFiltered()

		const virtualizedList = new VirtualizedList(tableBodyContainer, {
			height: tableBodyHeight,
			rowCount: aosFiltered.length,
			renderRow: (rowIndex: number) => {
				let rowData = aosFiltered[rowIndex]
				let rowElement = createTableDataRow(rowIndex)

				for (let colname of colnames) {
					let spec = colSpec[colname]
					let colData = spec.access(rowData)
					let colDataFormatted = spec.format(colData)
					let width = spec.width - SCROLLBAR_WIDTHS[1] / colnames.length
					addEl(rowElement, createTableCellString(width, colDataFormatted))
				}

				return rowElement
			},
			estimatedRowHeight: TABLE_ROW_HEIGHT_PX,
			rowHeight: TABLE_ROW_HEIGHT_PX,
		});

		regenBody = () => {
			let newTableBodyHeight = getTableBodyHeight(getTableHeight())
			if (newTableBodyHeight != tableBodyHeight) {
				tableBodyHeight = newTableBodyHeight
				tableBodyContainer.style.maxHeight = newTableBodyHeight + "px"
				virtualizedList.resize(newTableBodyHeight)
			}
		}

		for (let rowIndex = 0; rowIndex < aos.length; rowIndex += 1) {
			let rowData = aos[rowIndex]

			for (let colname of colnames) {
				let spec = colSpec[colname]
				let colData = spec.access(rowData)
				let colDataFormatted = spec.format(colData)
				DOWNLOAD_CSV[title] += "\"" + colDataFormatted + "\","
			}

			DOWNLOAD_CSV[title] += "\n"
			forRow?.(rowData)
		}
	}

	window.addEventListener("resize", regenBody)
	globalResizeListeners.push(regenBody)

	return table
}

//
// SECTION Data and main
//

type TimepointLabels = {
	pre: string,
	post: string,
}

type DataVarNamesLong = {
	format: "long",
	virus: string,
	reference: string,
	uniquePID: string[],
	timepoint: string,
	titre: string,
	timepointLabels: TimepointLabels,
}

type DataVarNamesWide = {
	format: "wide",
	virus: string,
	reference: string,
	preTitre: string,
	postTitre: string,
	uniquePID: string[], // NOTE(sen) Need for relative titres
}

type DataVarNames = DataVarNamesLong | DataVarNamesWide

type Data = {
	dataFull: Record<string, string | number>[],
	dataFiltered: Record<string, string | number>[],
	varNames: DataVarNames,
	colnames: string[],
}

const DEFAULT_DATA_VAR_NAMES: DataVarNamesLong = {
	format: "long",
	uniquePID: ["pid", "cohort", "vaccine", "serum_source", "testing_lab"],
	timepoint: "timepoint", titre: "titre", virus: "virus", reference: "reference_cell",
	timepointLabels: {pre: "Pre-vax", post: "Post-vax"},
}

const DEFAULT_DATA_VAR_NAMES_WIDE: DataVarNamesWide = {
	format: "wide", preTitre: "preTitre", postTitre: "postTitre", virus: "virus", reference: "reference_cell",
	uniquePID: [
		"year", "hemisphere", "flu_set", "test_type", "testing_lab", "location", 
		"serum_lab", "cohort", "strain", "passage", "subject_id", "vaccine"
	]
}

const guessDataVarNames = (existingNames: string[]) => {

	const colsWithTitre: string[] = []
	const colsWithVirus: string[] = []
	const colsWithReference: string[] = []
	const colsWithStrain: string[] = []
	const colsWithPassage: string[] = []
	for (let name of existingNames) {
		const lowerName = name.toLowerCase()
		if (lowerName.includes("titre") || lowerName.includes("titer")) {
			colsWithTitre.push(name)
		}
		if (lowerName.includes("virus") || lowerName.includes("antigen")) {
			colsWithVirus.push(name)
		}
		if (lowerName.includes("reference")) {
			colsWithReference.push(name)
		}
		if (lowerName.includes("strain")) {
			colsWithStrain.push(name)
		}
		if (lowerName.includes("passage")) {
			colsWithPassage.push(name)
		}
	}
	const format = colsWithTitre.length > 1 ? "wide" : "long"

	let varNames: DataVarNames

	switch (format) {
	case "wide": {
		let preTitre = colsWithTitre[0]
		let postTitre = colsWithTitre[1]
		for (let name of colsWithTitre) {
			const lowerName = name.toLowerCase()
			if (lowerName.includes("pre")) {
				preTitre = name
			}
			if (lowerName.includes("post")) {
				postTitre = name
			}
		}

		let uniquePidCols = []
		for (let colname of existingNames) {
			if (colname !== preTitre && colname !== postTitre && 
				!colsWithVirus.includes(colname) && !colsWithReference.includes(colname) &&
				!colsWithStrain.includes(colname) && !colsWithPassage.includes(colname))
			{
				uniquePidCols.push(colname)
			}
		}		
		varNames = {format: "wide", preTitre: preTitre, postTitre: postTitre, 
			virus: colsWithVirus[0], reference: colsWithReference[0], uniquePID: uniquePidCols}
	} break;

	case "long": {
		varNames = {...DEFAULT_DATA_VAR_NAMES}
		varNames.virus = colsWithVirus[0]
		for (let testName of varNames.uniquePID) {
			if (!existingNames.includes(testName)) {
				Arr.removeIndex(varNames.uniquePID, varNames.uniquePID.indexOf(testName))
			}
		}
		for (let existingName of existingNames) {
			if (existingName.toLowerCase().endsWith("id") && !varNames.uniquePID.includes(existingName)) {
				varNames.uniquePID.push(existingName)
			}
		}
	} break;
	}

	return varNames
}

const constructStringFromCols = (row: Record<string, string | number>, uniquePID: string[], sep?: string) => {
	let result = ""
	for (let pairIdIndex = 0; pairIdIndex < uniquePID.length; pairIdIndex++) {
		const pairId = uniquePID[pairIdIndex]
		result += `${row[pairId]}`
		if (sep !== undefined && pairIdIndex !== uniquePID.length - 1) {
			result += sep
		}
	}
	return result
}

const parseData = (input: string, xFacets: string[]): Data => {
	const data: Data = {
		dataFull: [],
		dataFiltered: [],
		colnames: [],
		varNames: DEFAULT_DATA_VAR_NAMES,
	}

	const parseResult = Papa.parse(input, {skipEmptyLines: true, dynamicTyping: true})

	if (parseResult.data.length > 0) {

		data.colnames = parseResult.data[0]
		data.varNames = guessDataVarNames(data.colnames)

		if (parseResult.data.length > 1) {

			let anyTitreIsFractional = false
			let anyTitreIsBelow5 = false

			const varNames = data.varNames
			for (let parsedRowIndex = 1; parsedRowIndex < parseResult.data.length; parsedRowIndex++) {
				const parsedRow = parseResult.data[parsedRowIndex]
				if (parsedRow.findIndex((val: any) => val !== null && val !== undefined && val !== "") !== -1) {
					let row: Record<string, string | number> = {}
					for (let colnameIndex = 0; colnameIndex < data.colnames.length; colnameIndex++) {
						const colname = data.colnames[colnameIndex]
						let value = parsedRow[colnameIndex]
						row[colname] = value
					}
					row.__UNIQUEPID__ = constructStringFromCols(row, data.varNames.uniquePID)
					row.__XFACET__ = constructStringFromCols(row, xFacets, FACET_LABEL_SEP)
					data.dataFull.push(row)

					switch (varNames.format) {
					case "long": {
						const titre = row[varNames.titre]
						anyTitreIsFractional = anyTitreIsFractional || isFractional(titre)
						anyTitreIsBelow5 = anyTitreIsBelow5 || <number>titre < 5
					} break

					case "wide": {
						const preTitre = row[varNames.preTitre]
						const postTitre = row[varNames.postTitre]
						anyTitreIsFractional = anyTitreIsFractional || isFractional(preTitre) || isFractional(postTitre)
						anyTitreIsBelow5 = anyTitreIsBelow5 || <number>preTitre < 5 || <number>postTitre < 5
					} break
					}
				}
			}

			const titreIsIndex = !anyTitreIsFractional && anyTitreIsBelow5
			const titreIndexToOg = (val: number) => 5 * (2 ** val)

			switch (varNames.format) {
			case "long": {
				if (titreIsIndex) {
					data.dataFull = data.dataFull.map(row => {row[varNames.titre] = titreIndexToOg(<number>row[varNames.titre]); return row})
				}

				const allTimepointLabels = Arr.unique(data.dataFull.map(row => row[varNames.timepoint])).filter((lbl: any) => lbl !== undefined && lbl !== null) as string[]
				for (let timepointLabel of allTimepointLabels) {
					if (timepointLabel.toLowerCase().includes("pre")) {
						varNames.timepointLabels.pre = timepointLabel
					} else if (timepointLabel.toLowerCase().includes("post")) {
						varNames.timepointLabels.post = timepointLabel
					}
				}
			} break

			case "wide": {
				if (titreIsIndex) {
					data.dataFull = data.dataFull.map(row => {row[varNames.postTitre] = titreIndexToOg(<number>row[varNames.postTitre]); row[varNames.preTitre] = 5 * (2 ** <number>row[varNames.preTitre]); return row})
				}
			} break
			}
		}
	}

	data.dataFiltered = [...data.dataFull]
	return data
}

const main = async () => {
	const mainEl = document.getElementById("main")!

	const inputBarSize = 200
	const inputContainer = addDiv(mainEl)
	inputContainer.style.display = "flex"
	inputContainer.style.flexDirection = "column"
	inputContainer.style.alignItems = "left"
	inputContainer.style.width = inputBarSize + "px"
	inputContainer.style.marginRight = "10px"
	inputContainer.style.height = "100vh"
	inputContainer.style.overflowY = "scroll"
	inputContainer.style.overflowX = "hidden"
	inputContainer.style.flexShrink = "0"

	const plotContainer = addDiv(mainEl)
	plotContainer.style.display = "flex"
	plotContainer.style.flexDirection = "column"
	plotContainer.style.alignItems = "top"
	plotContainer.style.height = "calc(100vh - 0px)"
	plotContainer.style.overflowY = "scroll"
	plotContainer.style.overflowX = "hidden"

	const plotParent = addDiv(plotContainer)
	plotParent.style.flexShrink = "0"
	plotParent.style.overflowX = "scroll"
	plotParent.style.overflowY = "hidden"

	const tableParent = addDiv(plotContainer)
	tableParent.style.display = "flex"

	const fileInputContainer = addDiv(inputContainer)
	fileInputContainer.style.border = "1px dashed var(--color-fileSelectBorder)"
	fileInputContainer.style.width = "100%"
	fileInputContainer.style.height = "50px"
	fileInputContainer.style.position = "relative"
	fileInputContainer.style.flexShrink = "0"
	fileInputContainer.style.boxSizing = "border-box"
	fileInputContainer.style.marginBottom = "20px"

	const fileInputLabel = addDiv(fileInputContainer)
	fileInputLabel.innerHTML = "SELECT FILE"
	fileInputLabel.style.position = "absolute"
	fileInputLabel.style.top = "0px"
	fileInputLabel.style.left = "0px"
	fileInputLabel.style.textAlign = "center"
	fileInputLabel.style.width = "100%"
	fileInputLabel.style.height = "100%"
	fileInputLabel.style.lineHeight = fileInputContainer.style.height
	fileInputLabel.style.fontWeight = "bold"
	fileInputLabel.style.letterSpacing = "2px"
	fileInputLabel.style.whiteSpace = "pre"

	let data: Data = {
		dataFull: [],
		dataFiltered: [],
		varNames: DEFAULT_DATA_VAR_NAMES,
		colnames: [],
	}

	const plotSettings: PlotSettings = {
		xFacets: [], xAxis: data.varNames.virus, refTitre: 40, refRatio: 4, refRelative: 0.5, theme: "dark",
		opacities: {points: 0.5, lines: 0.1, boxplots: 1, counts: 1, refLine: 1, means: 1, bars: 0},
		kind: "titres", relative: false, refVirus: "A/Victoria/2570/2019e", refType: "manual"
	}

	document.documentElement.setAttribute("theme", plotSettings.theme)

	const regenPlot = () => {
		removeChildren(plotParent)
		const plotBoxplotData: any[] = []
		const plot = createPlot(data, plotSettings, plotBoxplotData)
		addEl(plotParent, plot.canvas)
		plotParent.style.height = plot.totalHeight + "px"

		plot.canvas.addEventListener("click", (event) => {
			const scaledYMin = plot.spec.scaleYData(plot.spec.yMin)
			const scaledYMax = plot.spec.scaleYData(plot.spec.yMax)
			const scaledNewRef = scale(event.offsetY, plot.metrics.b, plot.metrics.t, scaledYMin, scaledYMax)
			if (scaledNewRef >= scaledYMin && scaledNewRef <= scaledYMax) {
				if (plotSettings.relative) {
					plotSettings.refRelative = scaledNewRef
				} else {
					const newRef = Math.exp(scaledNewRef)
					switch (plotSettings.kind) {
						case "titres": {plotSettings.refTitre = newRef} break;
						case "rises": {plotSettings.refRatio = newRef} break;
					}
				}
				regenPlot()
			}
		})

		const logFormat = plotSettings.relative ? (x: number) => x.toFixed(2) : (x: number) => Math.exp(x).toFixed(0)

		const cols: any = {}
		for (let varname of plotSettings.xFacets) {cols[varname] = {}}
		cols[plotSettings.xAxis] = {width: 200, access: "xTick"}
		if (plotSettings.kind === "titres") {
			cols.timepoint = {}
		}
		cols.mean = {format: logFormat}
		cols.meanLow95 = {format: logFormat, access: "meanLow"}
		cols.meanHigh95 = {format: logFormat, access: "meanHigh"}
		cols.min = {format: logFormat}
		cols.max = {format: logFormat}
		cols.q25 = {format: logFormat}
		cols.q75 = {format: logFormat}
		cols.median = {format: logFormat}

		removeChildren(tableParent)
		addEl(tableParent, createTableElementFromAos({
			aos: plotBoxplotData,
			colSpecInit: cols,
			title: plotSettings.kind === "titres" ? "GMT" : "GMR",
			getTableHeightInit: () => Math.max(window.innerHeight - plot.totalHeight - SCROLLBAR_WIDTHS[0], 300),
		}))
	}

	const onNewDataString = (contentsString: string) => {
		if (contentsString.length > 0) {
			data = parseData(contentsString, plotSettings.xFacets)
			if (!data.colnames.includes(plotSettings.xAxis)) {
				plotSettings.xAxis = data.varNames.virus
			}
			const viruses = Arr.unique(data.dataFull.map(x => x[data.varNames.virus]))
			if (!viruses.includes(plotSettings.refVirus)) {
				plotSettings.refVirus = <string>viruses[0]
			}
			regenDataRelatedInputs()
			regenPlot()
		}
	}

	const fileInputHandler = (event: Event) => {
		fileInputWholePage.style.visibility = "hidden"
		const el = <HTMLInputElement>event.target
		const file = el.files?.[0]
		if (file !== null && file !== undefined) {
			fileInputLabel.innerHTML = file.name
			file.text().then((string) => onNewDataString(string))
		}

		// NOTE(sen) The change/input event will not be fired for the same file twice otherwise
		el.value = ""
	}

	const fileInput = <HTMLInputElement>addEl(fileInputContainer, createEl("input"))
	fileInput.type = "file"
	fileInput.addEventListener("change", fileInputHandler)
	fileInput.style.opacity = "0"
	fileInput.style.cursor = "pointer"
	fileInput.style.width = "100%"
	fileInput.style.height = "100%"

	const fileInputWholePage = <HTMLInputElement>addEl(mainEl, createEl("input"))
	fileInputWholePage.type = "file"
	fileInputWholePage.addEventListener("change", fileInputHandler)
	fileInputWholePage.style.position = "fixed"
	fileInputWholePage.style.top = "0"
	fileInputWholePage.style.left = "0"
	fileInputWholePage.style.width = "100%"
	fileInputWholePage.style.height = "100%"
	fileInputWholePage.style.opacity = "0.5"
	fileInputWholePage.style.visibility = "hidden"
	fileInputWholePage.style.zIndex = "999"
	fileInputWholePage.style.background = "gray"

	window.addEventListener("dragenter", () => fileInputWholePage.style.visibility = "visible")
	fileInputWholePage.addEventListener("dragleave", () => fileInputWholePage.style.visibility = "hidden")

	addEl(inputContainer, createSwitch({
		init: plotSettings.theme,
		opts: <Theme[]>THEMES,
		onUpdate: (opt) => {
			document.documentElement.setAttribute("theme", opt)
			plotSettings.theme = opt
			regenPlot()
		},
		optElementStyle: switchOptionStyleAllCaps,
		optContainerStyle: (container) => {
			container.style.display = "flex"
			container.style.flexDirection = "row"
			container.style.marginBottom = "20px"
		}
	}))

	addEl(inputContainer, createSwitch({
		init: plotSettings.kind,
		opts: <PlotMode[]>PLOT_MODES,
		onUpdate: (plotModes) => {
			plotSettings.kind = plotSettings.kind === "titres" ? "rises" : "titres"
			regenPlot()
		},
		optElementStyle: switchOptionStyleAllCaps,
		optContainerStyle: (el) => {
			el.style.display = "flex"
			el.style.flexDirection = "row"
			el.style.marginBottom = "20px"
		}
	}))

	addEl(inputContainer, createSwitch({
		init: plotSettings.relative ? "Rel" : "Abs",
		opts: ["Abs", "Rel"],
		onUpdate: (rel) => {
			plotSettings.relative = rel === "Rel"
			if (plotSettings.relative) {regenReferenceSwitch()}
			else {removeChildren(referenceSwitchContainer)}
			regenPlot()
		},
		optElementStyle: switchOptionStyleAllCaps,
		optContainerStyle: (el) => {
			el.style.display = "flex"
			el.style.flexDirection = "row"
			el.style.marginBottom = "20px"
		}
	}))

	const collapsibleSelectorSpacing = "10px"

	const referenceSwitchContainer = addDiv(inputContainer)
	const regenReferenceSwitch = () => {
		const allViruses = Arr.unique(data.dataFiltered.map(row => <string>row[data.varNames.virus])).sort(virusSort)
		const referenceSwitch = createSwitch({
			init: plotSettings.refVirus,
			opts: allViruses,
			onUpdate: (ref) => {
				plotSettings.refVirus = ref
				regenPlot()
			},
			name: "Reference",
		})
		referenceSwitch.style.marginBottom = collapsibleSelectorSpacing
		removeChildren(referenceSwitchContainer)
		addEl(referenceSwitchContainer, referenceSwitch)
	}

	const refTypeSwitch = addEl(inputContainer, createSwitch({
		init: plotSettings.refType,
		opts: ["manual", "data"],
		onUpdate: (refType) => {
			plotSettings.refType = refType
			regenPlot()
		},
		name: "Relative mode"
	}))
	refTypeSwitch.style.marginBottom = collapsibleSelectorSpacing

	const opacitiesSwitch = addEl(inputContainer, createSwitch({
		init: <PlotElement[]>PLOT_ELEMENTS,
		opts: <PlotElement[]>PLOT_ELEMENTS,
		onUpdate: (el, fromLeft) => {
			// @ts-ignore
			plotSettings.opacities[el] = fromLeft
			regenPlot()
		},
		name: "Elements",
		optElementStyle: switchOptionStyleAllCaps,
		horizontalGradient: Object.values(plotSettings.opacities),
		helpText: "Element transparency. Click on the plot to change refline position",
	}))
	opacitiesSwitch.style.marginBottom = collapsibleSelectorSpacing

	const addInputSep = (parent: HTMLElement, label: string) => {
		const sep = addDiv(parent)
		sep.textContent = label
		sep.style.textAlign = "center"
		sep.style.padding = "10px"
		sep.style.fontWeight = "bold"
		sep.style.textTransform = "uppercase"
		sep.style.letterSpacing = "2px"
		sep.style.borderBottom = "1px solid var(--color-border)"
		sep.style.marginBottom = "10px"
	}

	const dataRelatedInputs = addDiv(inputContainer)
	const regenDataRelatedInputs = () => {
		removeChildren(dataRelatedInputs)

		const facetSwitch = addEl(dataRelatedInputs, createSwitch({
			init: plotSettings.xFacets,
			opts: data.colnames,
			onUpdate: (sel) => {
				plotSettings.xFacets = sel
				data.dataFull = data.dataFull.map(row => {row.__XFACET__ = constructStringFromCols(row, plotSettings.xFacets, FACET_LABEL_SEP); return row})
				data.dataFiltered = data.dataFiltered.map(row => {row.__XFACET__ = constructStringFromCols(row, plotSettings.xFacets, FACET_LABEL_SEP); return row})
				regenPlot()
			},
			name: "Facet by",
			singleNullable: true,
		}))
		facetSwitch.style.marginBottom = collapsibleSelectorSpacing

		const xAxisSwitch = addEl(dataRelatedInputs, createSwitch({
			init: plotSettings.xAxis,
			opts: data.colnames,
			onUpdate: (sel) => {
				plotSettings.xAxis = sel
				regenPlot()
			},
			name: "X axis",
		}))
		xAxisSwitch.style.marginBottom = collapsibleSelectorSpacing

		addInputSep(dataRelatedInputs, "filters")
		type Filter = {
			selected: any[],
			all: any[],
			optElements: HTMLElement[],
		}
		const filters: Record<string, Filter> = {}

		const updateVisible = (colname: string) => {
			let dataFilteredOther = [...data.dataFull]
			for (let otherColname of data.colnames) {
				if (otherColname !== colname) {
					const allowedVals = filters[otherColname].selected
					dataFilteredOther = dataFilteredOther.filter(row => allowedVals.includes(row[otherColname]))
				}
			}
			const visible = Arr.unique(dataFilteredOther.map(row => row[colname]))
			const thisFilter = filters[colname]
			for (let optIndex = 0; optIndex < thisFilter.all.length; optIndex++) {
				const thisEl = thisFilter.optElements[optIndex]
				if (thisEl !== undefined) {
					if (visible.includes(thisFilter.all[optIndex])) {
						thisEl.style.display = "block"
					} else {
						thisEl.style.display = "none"
					}
				}
			}
		}

		for (let colname of data.colnames) {
			const colUniqueVals = Arr.unique(data.dataFull.map(row => row[colname] as any)).sort(getSorter(colname, data.varNames))
			filters[colname] = {selected: colUniqueVals, all: [...colUniqueVals], optElements: []}
			const el = addEl(dataRelatedInputs, createSwitch({
				init: colUniqueVals,
				opts: colUniqueVals,
				onUpdate: (sel) => {
					filters[colname].selected = sel
					data.dataFiltered = [...data.dataFull]
					for (let otherColname of data.colnames) {
						const allowedVals = filters[otherColname].selected
						data.dataFiltered = data.dataFiltered.filter(row => allowedVals.includes(row[otherColname]))
						updateVisible(otherColname)
					}
					regenReferenceSwitch()
					regenPlot()
				},
				name: colname,
				optElements: filters[colname].optElements,
			}))
			el.style.marginBottom = collapsibleSelectorSpacing
		}

		addInputSep(dataRelatedInputs, "colnames")

		let lastWideFormat = {...DEFAULT_DATA_VAR_NAMES_WIDE}
		let lastLongFormat = {...DEFAULT_DATA_VAR_NAMES}
		const varNames = data.varNames
		switch (varNames.format) {
		case "long": {
			lastLongFormat = varNames
			lastWideFormat.virus = varNames.virus
		} break
		case "wide": {
			lastWideFormat = varNames
			lastLongFormat.virus = varNames.virus
		} break
		}

		addEl(dataRelatedInputs, createSwitch({
			init: data.varNames.format,
			opts: <DataFormat[]>DATA_FORMATS,
			onUpdate: (dataFormat) => {
				const varNames = data.varNames
				switch (varNames.format) {
				case "long": {
					lastLongFormat = varNames
					lastWideFormat.virus = varNames.virus
					data.varNames = lastWideFormat
				} break
				case "wide": {
					lastWideFormat = varNames
					lastLongFormat.virus = varNames.virus
					data.varNames = lastLongFormat
				} break
				}
				regenPlot()
				regenColnameInputs()
			},
			optElementStyle: switchOptionStyleAllCaps,
			optContainerStyle: (el) => {
				el.style.display = "flex"
				el.style.flexDirection = "row"
				el.style.marginBottom = "10px"
			}
		}))

		const colnameInputsContainer = addDiv(dataRelatedInputs)

		const regenColnameInputs = () => {
			removeChildren(colnameInputsContainer)

			for (let varName of Object.keys(data.varNames)) {
				if (varName !== "format" && varName !== "timepointLabels") {
					let helpText: string | undefined = undefined
					if (varName === "uniquePID") {
						helpText = "Set of variables that uniquely identifies a subject (pre/post vax titres for different viruses for the same person)"
					}
					const el = addEl(colnameInputsContainer, createSwitch({
						init: data.varNames[varName as keyof DataVarNames],
						opts: data.colnames,
						onUpdate: (sel) => {
							// @ts-ignore
							data.varNames[varName as keyof DataVarNames] = sel

							if (varName === "uniquePID") {
								data.dataFull = data.dataFull.map(row => {
									row.__UNIQUEPID__ = constructStringFromCols(row, data.varNames.uniquePID)
									return row
								})
								data.dataFiltered = data.dataFiltered.map(row => {
									row.__UNIQUEPID__ = constructStringFromCols(row, data.varNames.uniquePID)
									return row
								})
							}

							if (varName === "timepoint") {
								regenTimepointLabelInputs()
							}

							regenPlot()
						},
						name: varName,
						helpText: helpText,
					}))
					el.style.marginBottom = collapsibleSelectorSpacing
				}
			}

			const timepointLabelInputContainer = addDiv(colnameInputsContainer)
			const regenTimepointLabelInputs = () => {
				const varNames = data.varNames
				removeChildren(timepointLabelInputContainer)
				if (varNames.format === "long") {
					const allTimepoints = Arr.unique(data.dataFiltered.map(row => row[varNames.timepoint]))
					const preLab = addEl(timepointLabelInputContainer, createSwitch({
						init: varNames.timepointLabels.pre,
						opts: allTimepoints,
						onUpdate: (sel) => {
							varNames.timepointLabels.pre = sel
							regenPlot()
						},
						name: "pre label",
					}))
					preLab.style.marginBottom = collapsibleSelectorSpacing
					addEl(timepointLabelInputContainer, createSwitch({
						init: varNames.timepointLabels.post,
						opts: allTimepoints,
						onUpdate: (sel) => {
							varNames.timepointLabels.post = sel
							regenPlot()
						},
						name: "post label",
					}))
				}
			}
			regenTimepointLabelInputs()
		}

		regenColnameInputs()

		regenReferenceSwitch()
	}

	// NOTE(sen) Dev only for now
	const fetchAndUpdate = async (path: string) => {
		let fetchString = ""
		try {
			const resp = await fetch(path)
			if (resp.ok) {
				fetchString = await resp.text()
			}
		} catch (e) {}
		onNewDataString(fetchString)
	}

	fetchAndUpdate("/vis2022sep.csv")

	window.addEventListener("keypress", (event: KeyboardEvent) => {
		switch (event.key) {
		case "1": {fetchAndUpdate("/vis2022.csv")} break
		case "2": {fetchAndUpdate("/HI WHO22 full panel.csv")} break
		case "3": {fetchAndUpdate("/pivot-wide.csv")} break
		case "4": {fetchAndUpdate("/visualiserdata.csv")} break
		case "5": {fetchAndUpdate("/2022_SH.titers.txt")} break
		case "6": {fetchAndUpdate("/vis2022sep.csv")} break
		}
	})
}

main()

// TODO(sen) Better summary table widths
// TODO(sen) Highlight a virus
// TODO(sen) Better titre format detection (and switch)
// TODO(sen) Detect excessive faceting
// TODO(sen) Better colwidth for xfacet and xtick
// TODO(sen) Improve boxplot shading
// TODO(sen) Better colnames guessing (especially the id part)

// NOTE(sen) To make this a "module"
export {}
