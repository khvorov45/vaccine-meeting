type Titres = any[]
type Rises = any[]
type CladeAverageTitres = any[]
type CladeAverageRises = any[]
type CirculatingAverageTitres = any[]
type CirculatingAverageRises = any[]
type VaccineViruses = string[]
type CladeFreqs = Record<string, number>
type SubtypeClades = Record<string, string[]>
type Filter = {elements: HTMLElement[], options: [], selected: string}
type Filters = {subtype: Filter, serum_source: Filter, cohort: Filter,}

type Colors = {
	theme: string,
	preVax: string,
	postVax: string,
	vaccinePreVax: string,
	vaccinePostVax: string,
	text: string,
	axis: string,
	thresholdLine: string,
	grid: string,
}

type PlotSizes = {
	plotHeight: number,
	widthPerElement: number,
	axisPadLeft: number,
	axisPadBottom: number,
	axisPadTop: number,
	dataPadX: number,
	dataPadY: number,
	tickLength: number,
	prePostDistance: number,
	boxPlotWidth: number,
	svgTextLineHeightGuess: number,
}

type PlotContainer = { element: HTMLElement, titres: HTMLElement, rises: HTMLElement }
type PlotContainers = { noSummary: PlotContainer, cladeAverage: PlotContainer, circulatingAverage: PlotContainer }

const THEMES_ = ["dark", "light"] as const
const THEMES = THEMES_ as unknown as string[]
type Theme = (typeof THEMES_)[number]

const PLOT_MODES_ = ["titres", "rises"] as const
const PLOT_MODES = PLOT_MODES_ as unknown as string[]
type PlotMode = (typeof PLOT_MODES_)[number]

const SUMMARY_TYPES_ = ["noSummary", "cladeAverage", "circulatingAverage"] as const
const SUMMARY_TYPES = SUMMARY_TYPES_ as unknown as string[]
type SummaryType = (typeof SUMMARY_TYPES_)[number]

const PLOT_ELEMENTS_ = ["points", "lines", "boxplots", "counts", "refLine", "means"] as const
const PLOT_ELEMENTS = PLOT_ELEMENTS_ as unknown as string[]
type PlotElement = (typeof PLOT_ELEMENTS_)[number]
type Opacities = Record<PlotElement, number>

type DataVarNames = {
	uniquePairId: string[],
	timepoint: string,
	titre: string,
	virus: string,
}

type TimepointLabels = {
	pre: string,
	post: string,
}

type Data = {
	dataFull: Record<string, string | number>[],
	dataFiltered: Record<string, string | number>[],
	varNames: DataVarNames,
	timepointLabels: TimepointLabels,
	colnames: string[],
}

//
// SECTION Math
//

const arrAsc = (arr: number[]) => arr.sort((a, b) => a - b)
const arrSum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
const arrMean = (arr: number[]) => arrSum(arr) / arr.length

const arrCumSum = (arr: number[]) => {
	let result = []
	let current = 0
	for (let val of arr) {
		current += val
		result.push(current)
	}
	return result
}

const arrSd = (arr: number[]) => {
	const mu = arrMean(arr)
	const diffArr = arr.map((a) => (a - mu) ** 2)
	return Math.sqrt(arrSum(diffArr) / (arr.length - 1))
}

const arrSortedAscQuantile = (sorted: number[], q: number) => {
	const pos = (sorted.length - 1) * q
	const base = Math.floor(pos)
	const rest = pos - base
	let result = sorted[base]
	if (sorted[base + 1] !== undefined) {
		result += rest * (sorted[base + 1] - sorted[base])
	}
	return result
}

const arrQuantile = (arr: number[], q: number) => arrSortedAscQuantile(arrAsc(arr), q)
const arrSortedAscMin = (sorted: number[]) => sorted[0]
const arrSortedAscMax = (sorted: number[]) => sorted[sorted.length - 1]
const arrUnique = <T>(arr: T[]) => Array.from(new Set(arr))
const arrRemoveIndex = (arr: any[], index: number) => arr.splice(index, 1)

const arrLinSearch = <T>(arr: T[], item: T) => {
	let result = -1
	for (let index = 0; index < arr.length; index += 1) {
		let elem = arr[index]
		if (elem === item) {
			result = index
			break
		}
	}
	return result
}

type NestedArrIter = {
	arrIndices: number[],
	done: boolean,
	nestedArr: any[][],
}

const beginNestedArrIter = (nestedArr: any[][]): NestedArrIter => {
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

const getCurrentNestedArrValues = (iter: NestedArrIter) => {
	let facets = [] as any[]
	for (let facetSetIndex = 0; facetSetIndex < iter.nestedArr.length; facetSetIndex += 1) {
		const setValueIndex = iter.arrIndices[facetSetIndex]
		facets.push(iter.nestedArr[facetSetIndex][setValueIndex])
	}
	return facets
}

const nextNestedArrIter = (iter: NestedArrIter) => {
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

const expandGrid = (input: any[][]): any[][] => {
	const result = []
	for (const nestedArrIter = beginNestedArrIter(input);
		!nestedArrIter.done;
		nextNestedArrIter(nestedArrIter))
	{
		let nestedArrs = getCurrentNestedArrValues(nestedArrIter)
		result.push(nestedArrs)
	}
	return result
}

const randUnif = (from: number, to: number) => {
	let rand01 = Math.random()
	let range = (to - from)
	let randRange = rand01 * range
	let result = from + randRange
	return result
}

const randNorm = (mean: number, sd: number) => {
	let u1 = 0
	let u2 = 0
	while (u1 === 0) { u1 = Math.random() }
	while (u2 === 0) { u2 = Math.random() }
	let randNorm01 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
	let result = randNorm01 * sd + mean
	return result
}

const toRadians = (val: number) => val / 360 * 2 * Math.PI

type Rect = {
	l: number,
	r: number,
	t: number,
	b: number,
}

const rectShrink = (rect: Rect, amount: number): Rect => {
	return {l: rect.l + amount, r: rect.r - amount, t: rect.t + amount, b: rect.b - amount}
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
		let q25 = arrSortedAscQuantile(arrSorted, 0.25)
		let q75 = arrSortedAscQuantile(arrSorted, 0.75)
		const mean = arrMean(arrSorted)
		const meanSe = arrSd(arrSorted) / Math.sqrt(arr.length)
		result = {
			min: arrSorted[0],
			max: arrSorted[arrSorted.length - 1],
			median: arrSortedAscQuantile(arrSorted, 0.5),
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

const numberSort = (x: number, y: number) => (x - y)
const generalSort = (x: any, y: any) => (x > y ? 1 : x < y ? -1 : 0)

const desiredOrderSort = (ord: any[]) => {
	return (a: any, b: any) => {
		let result = 0
		let ai = ord.indexOf(a)
		let bi = ord.indexOf(b)
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

const colChannel255ToString = (channel: number) => {
	if (channel <= 1) {
		channel *= 255
	}
	return Math.round(channel).toString(16).padStart(2, "0")
}

const colChangeSaturation = (col: string, satDelta: number) => {
	let alpha = col.slice(7, 9)
	let red = parseInt(col.slice(1, 3), 16)
	let green = parseInt(col.slice(3, 5), 16)
	let blue = parseInt(col.slice(5, 7), 16)

	let mean = (red + green + blue) / 3

	red = (red - mean) * satDelta + mean
	green = (green - mean) * satDelta + mean
	blue = (blue - mean) * satDelta + mean

	red = Math.max(Math.min(Math.round(red), 255), 0)
	green = Math.max(Math.min(Math.round(green), 255), 0)
	blue = Math.max(Math.min(Math.round(blue), 255), 0)

	let redNew = colChannel255ToString(red)
	let greenNew = colChannel255ToString(green)
	let blueNew = colChannel255ToString(blue)

	return "#" + redNew + greenNew + blueNew + alpha
}

const isGood = (n: any) => n !== null && n !== undefined && !isNaN(n)

//
// SECTION DOM
//

const XMLNS = "http://www.w3.org/2000/svg"
const createEl = (name: string) => document.createElement(name)
const createDiv = () => createEl("div")
const addEl = (parent: HTMLElement, child: HTMLElement) => {parent.appendChild(child); return child}
const addDiv = (parent: HTMLElement) => addEl(parent, createDiv())
const removeChildren = (el: HTMLElement) => {while (el.lastChild) {el.removeChild(el.lastChild)}}

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
		let result = (!multiple && opt === currentSel) ||
			(multiple && arrLinSearch(<SingleOpt[]>currentSel, opt) !== -1)
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

					if (opt !== currentSel) {
						for (let child of optContainer.childNodes) {
							(<HTMLElement>child).style.backgroundColor = normalCol
						}
						optElement.style.backgroundColor = selectedCol
						currentSel = <OptType>opt
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
						let optIndex = arrLinSearch(<SingleOpt[]>currentSel, opt)
						if (optIndex !== -1) {
							optElement.style.backgroundColor = normalCol
							arrRemoveIndex(<SingleOpt[]>currentSel, optIndex)
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
		// const grad = renderer.createLinearGradient(x1, y1, x2, y2)
		// grad.addColorStop(0, color1)
		// grad.addColorStop(1, color2)

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

const drawPath = (
	renderer: CanvasRenderingContext2D,
	yCoords: (number | null)[], xCoords: number[], color: string
) => {
	renderer.strokeStyle = color
	renderer.beginPath()
	let started = false
	for (let pointIndex = 0; pointIndex < yCoords.length; pointIndex += 1) {
		let xCoord = xCoords[pointIndex];
		let yCoord = yCoords[pointIndex];
		if (yCoord !== null) {
			if (!started) {
				renderer.moveTo(xCoord, yCoord)
				started = true
			} else {
				renderer.lineTo(xCoord, yCoord)
			}
		}
	}
	renderer.stroke()
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
	renderer.rotate(toRadians(angle))

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

	const allXTicksXCoords = []
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

	const allYTicksYCoords = []
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
	const facetSepColor = axisCol + colChannel255ToString(0.4)
	const facetSepThiccness = 1
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
		const alphaStr = colChannel255ToString(boxesAlpha)
		const color = baseColor + alphaStr
		const altColor = baseAltColor + alphaStr
		drawRectOutline(plot.renderer, boxplotBody, color, lineThiccness)
		drawRectOutline(plot.renderer, rectShrink(boxplotBody, lineThiccness), altColor, lineThiccness)

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
		const alphaStr = colChannel255ToString(meansAlpha)
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

const getSorter = (varName: string, varNames: DataVarNames) => varName === varNames.virus ? virusSort : generalSort

type PlotSettings = {
	xFacets: string[],
	xAxis: string,
	refTitre: number,
	refRatio: number,
	theme: Theme,
	opacities: Opacities,
	kind: PlotMode,
}

const createPlot = (data: Data, settings: PlotSettings) => {

	const facetLabelSep = "; "
	const xFacetValsAll = expandGrid(settings.xFacets.map(xFacet => arrUnique(data.dataFiltered.map(row => row[xFacet] as any)).sort(getSorter(xFacet, data.varNames)))).map(vals => vals.join(facetLabelSep))
	const xFacetVals: string[] = []
	const xTicksPerFacet = xFacetValsAll.length > 0 ? xFacetValsAll.map(xFacetVal => {
		const dataFacet = data.dataFiltered.filter(row => constructStringFromCols(row, settings.xFacets, facetLabelSep) === xFacetVal)
		const facetXTicks = arrUnique(dataFacet.map(row => row[settings.xAxis] as any)).sort(getSorter(settings.xAxis, data.varNames))
		if (dataFacet.length > 0) {
			xFacetVals.push(xFacetVal)
		}
		return facetXTicks
	}).filter(arr => arr.length > 0) : [arrUnique(data.dataFiltered.map(row => row[settings.xAxis] as any)).sort(getSorter(settings.xAxis, data.varNames))]

	const plot = beginPlot({
		widthTick: 50,
		heightTick: 30,
		scaleXData: (xVal, xFacetIndex) => xTicksPerFacet[xFacetIndex].indexOf(xVal),
		scaleYData: Math.log,
		padAxis: {l: 100, t: 50, r: 50, b: 150},
		padData: {l: 40, t: 20, r: 40, b: 20},
		padFacet: 80,
		scaledXMinPerFacet: xTicksPerFacet.map(ticks => 0),
		scaledXMaxPerFacet: xTicksPerFacet.map(ticks => ticks.length - 1),
		yMin: settings.kind === "titres" ? 5 : 0.25,
		yMax: settings.kind === "titres" ? 5120 : 256,
		xTicksPerFacet: xTicksPerFacet,
		yTicks: settings.kind === "titres" ? [5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120] :
			[0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256],
		xFacetVals: xFacetVals,
		xLabel: "",
		yLabel: settings.kind === "titres" ? "Titre" : "Rises",
		theme: settings.theme,
	})

	// NOTE(sen) Reference line
	{
		const yCoord = plot.scaleYToPx(settings.kind === "titres" ? settings.refTitre : settings.refRatio)
		const color = plot.axisColor + colChannel255ToString(settings.opacities.refLine)
		const thickness = 1
		drawLine(plot.renderer, plot.spec.padAxis.l, yCoord, plot.totalWidth - plot.spec.padAxis.r, yCoord, color, color, thickness, [])
	}

	for (let xFacetIndex = 0; xFacetIndex < Math.max(xFacetVals.length, 1); xFacetIndex++) {
		const xFacetVal = xFacetVals[xFacetIndex]
		const xTicksForFacet = xTicksPerFacet[xFacetIndex]

		for (let xTick of xTicksForFacet) {
			const stripData = data.dataFiltered.filter(row => (settings.xFacets.length > 0 ? constructStringFromCols(row, settings.xFacets, facetLabelSep) === xFacetVal : true) && row[settings.xAxis] === xTick)
			const pids = arrUnique(stripData.map(row => row.__UNIQUEPID__))
			const stripXCoord = plot.scaleXToPx(xTick, xFacetVal)

			const leftRightStep = plot.spec.widthTick / 4
			const preColor = "#308A36"
			const postColor = "#7FA438"

			const preData = stripData.filter(row => row[data.varNames.timepoint] === data.timepointLabels.pre)
			const postData = stripData.filter(row => row[data.varNames.timepoint] === data.timepointLabels.post)

			// NOTE(sen) Points and lines connecting them
			let preCount = 0
			let postCount = 0
			const scaledRatios = []
			for (let pid of pids) {
				const pre = preData.filter(row => row.__UNIQUEPID__ === pid)
				const post = postData.filter(row => row.__UNIQUEPID__ === pid)

				const preTitres = pre.map(row => row[data.varNames.titre] as number)
				const postTitres = post.map(row => row[data.varNames.titre] as number)

				const adjacentDistance = plot.spec.widthTick - leftRightStep * 2

				const jitterMaxX = adjacentDistance / 4
				const jitterX = randUnif(-jitterMaxX, jitterMaxX)

				const jitterMaxY = plot.spec.heightTick / 4
				const jitterY = randUnif(-jitterMaxY, jitterMaxY)

				const pointSize = 2
				const pointAlphaStr = colChannel255ToString(settings.opacities.points)
				const lineAlphaStr = colChannel255ToString(settings.opacities.lines)
				const preColorWithAlpha = preColor + pointAlphaStr
				const postColorWithAlpha = postColor + pointAlphaStr

				if (settings.kind === "titres") {
					const preXCoord = stripXCoord - leftRightStep + jitterX
					const postXCoord = stripXCoord + leftRightStep + jitterX

					const preYCoords = preTitres.map(titre => plot.scaleYToPx(titre) + jitterY)
					const postYCoords = postTitres.map(titre => plot.scaleYToPx(titre) + jitterY)

					preCount += preYCoords.length
					postCount += postYCoords.length

					const lineSize = 1

					for (let preYCoord of preYCoords) {
						drawPoint(plot.renderer, preXCoord, preYCoord, pointSize, preColorWithAlpha, preColorWithAlpha)
					}
					for (let postYCoord of postYCoords) {
						drawPoint(plot.renderer, postXCoord, postYCoord, pointSize, postColorWithAlpha, postColorWithAlpha)
					}

					if (preYCoords.length === 1 && postYCoords.length === 1) {
						const preC = preColor + lineAlphaStr
						const postC = postColor + lineAlphaStr
						drawLine(plot.renderer, preXCoord, preYCoords[0], postXCoord, postYCoords[0], preC, postC, lineSize, [])
					}
				} else if (preTitres.length === 1 && postTitres.length === 1) {
					const scaledRatio = plot.spec.scaleYData(postTitres[0] / preTitres[0])
					scaledRatios.push(scaledRatio)
					const yCoord = plot.scaleScaledYToPx(scaledRatio) + jitterY
					drawPoint(plot.renderer, stripXCoord + jitterX, yCoord, pointSize, preColorWithAlpha, preColorWithAlpha)
				}
			}

			const altColor = settings.theme === "dark" ? "#000000" : "#ffffff"

			// NOTE(sen) Boxplots
			const boxWidth = leftRightStep
			const boxLineThiccness = 2
			if (settings.kind === "titres") {
				const preStats = getBoxplotStats(preData.map(row => plot.spec.scaleYData(row[data.varNames.titre] as number)))
				const postStats = getBoxplotStats(postData.map(row => plot.spec.scaleYData(row[data.varNames.titre] as number)))

				if (preStats !== null) {
					addBoxplot(
						plot, preStats, stripXCoord - leftRightStep, boxWidth,
						preColor, altColor, boxLineThiccness,
						settings.opacities.boxplots, settings.opacities.means,
					)
				}
				if (postStats !== null) {
					addBoxplot(
						plot, postStats, stripXCoord + leftRightStep, boxWidth,
						postColor, altColor, boxLineThiccness,
						settings.opacities.boxplots, settings.opacities.means,
					)
				}
			} else if (scaledRatios.length > 0) {
				const ratioStats = getBoxplotStats(scaledRatios)
				if (ratioStats !== null) {
					addBoxplot(
						plot, ratioStats, stripXCoord, boxWidth,
						preColor, altColor, boxLineThiccness,
						settings.opacities.boxplots, settings.opacities.means,
					)
				}
			}

			// NOTE(sen) Counts
			{
				const yCoord = plot.scaleYToPx(plot.spec.yTicks[plot.spec.yTicks.length - 1])
				const alphaStr = colChannel255ToString(settings.opacities.counts)

				if (settings.kind === "titres") {
					drawText(
						plot.renderer, `${preCount}`,
						stripXCoord - leftRightStep,
						yCoord,
						preColor + alphaStr, -90, "middle", "center", altColor + alphaStr,
					)
					drawText(
						plot.renderer, `${postCount}`,
						stripXCoord + leftRightStep,
						yCoord,
						postColor + alphaStr, -90, "middle", "center", altColor + alphaStr,
					)
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
// SECTION Data and main
//

const DEFAULT_DATA_VAR_NAMES: DataVarNames = {
	uniquePairId: ["pid", "cohort", "vaccine", "serum_source", "virus", "testing_lab"],
	timepoint: "timepoint", titre: "titre", virus: "virus"
}
const DEFAULT_TIMEPOINT_LABELS: TimepointLabels = {pre: "Pre-vax", post: "Post-vax"}

const guessDataVarNames = (existingNames: string[]) => {
	const varNames = {...DEFAULT_DATA_VAR_NAMES}
	varNames.uniquePairId = [...DEFAULT_DATA_VAR_NAMES.uniquePairId]

	// NOTE(sen) Unique names
	for (let testName of DEFAULT_DATA_VAR_NAMES.uniquePairId) {
		if (!existingNames.includes(testName)) {
			arrRemoveIndex(varNames.uniquePairId, varNames.uniquePairId.indexOf(testName))
		}
	}
	for (let existingName of existingNames) {
		if (existingName.toLowerCase().endsWith("id") && !varNames.uniquePairId.includes(existingName)) {
			varNames.uniquePairId.push(existingName)
		}
	}

	return varNames
}

const constructStringFromCols = (row: Record<string, string | number>, uniquePairId: string[], sep?: string) => {
	let result = ""
	for (let pairIdIndex = 0; pairIdIndex < uniquePairId.length; pairIdIndex++) {
		const pairId = uniquePairId[pairIdIndex]
		result += `${row[pairId]}`
		if (sep !== undefined && pairIdIndex !== uniquePairId.length - 1) {
			result += sep
		}
	}
	return result
}

const parseData = (input: string): Data => {
	const data: Data = {
		dataFull: [], dataFiltered: [],
		varNames: DEFAULT_DATA_VAR_NAMES,
		timepointLabels: DEFAULT_TIMEPOINT_LABELS, colnames: []
	}

	if (input.length > 0) {
		const lines = input.split(/\r?\n/).filter((line) => line !== "")
		const linesSplit = lines.map((line) => line.split(","))
		data.colnames = linesSplit[0]

		data.varNames = guessDataVarNames(data.colnames)

		if (linesSplit.length > 1) {
			for (let values of linesSplit.slice(1)) {
				let row: Record<string, string | number> = {}
				for (let [index, name] of data.colnames.entries()) {
					let value: string | number = values[index]
					if (name === data.varNames.titre) {
						value = parseFloat(value)
					}
					row[name] = value
				}
				row.__UNIQUEPID__ = constructStringFromCols(row, data.varNames.uniquePairId)
				data.dataFull.push(row)
				data.dataFiltered.push(row)
			}
		}

		const allTimepointLabels = arrUnique(data.dataFull.map(row => row[data.varNames.timepoint])) as string[]
		for (let timepointLabel of allTimepointLabels) {
			if (timepointLabel.toLowerCase().includes("pre")) {
				data.timepointLabels.pre = timepointLabel
			} else if (timepointLabel.toLowerCase().includes("post")) {
				data.timepointLabels.post = timepointLabel
			}
		}
	}

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

	let data: Data = {
		dataFull: [],
		dataFiltered: [],
		varNames: DEFAULT_DATA_VAR_NAMES,
		timepointLabels: DEFAULT_TIMEPOINT_LABELS,
		colnames: []
	}

	const plotSettings: PlotSettings = {
		xFacets: [], xAxis: data.varNames.virus, refTitre: 40, refRatio: 4, theme: "dark",
		opacities: {points: 0.5, lines: 0.1, boxplots: 1, counts: 1, refLine: 1, means: 1},
		kind: "titres",
	}

	document.documentElement.setAttribute("theme", plotSettings.theme)

	const regenPlot = () => {
		removeChildren(plotParent)
		const plot = createPlot(data, plotSettings)
		addEl(plotParent, plot.canvas)
	}

	const onNewDataString = (contentsString: string) => {
		if (contentsString.length > 0) {
			data = parseData(contentsString)
			regenDataRelatedInputs()
			regenPlot()
		}
	}

	const fileInputHandler = (event: Event) => {
		fileInputWholePage.style.visibility = "hidden"
		let file = (<HTMLInputElement>event.target).files?.[0]
		if (file !== null && file !== undefined) {
			fileInputLabel.innerHTML = file.name
			file.text().then((string) => onNewDataString(string))
		}
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

	const themeSwitch = addEl(inputContainer, createSwitch({
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

	const modeSwitch = addEl(inputContainer, createSwitch({
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

	const collapsibleSelectorSpacing = "10px"

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
		horizontalGradient: [0.5, 0.1, 1, 1, 1, 1],
		helpText: "Element transparency",
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
			const visible = arrUnique(dataFilteredOther.map(row => row[colname]))
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
			const colUniqueVals = arrUnique(data.dataFull.map(row => row[colname] as any)).sort(getSorter(colname, data.varNames))
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
					regenPlot()
				},
				name: colname,
				optElements: filters[colname].optElements,
			}))
			el.style.marginBottom = collapsibleSelectorSpacing
		}

		addInputSep(dataRelatedInputs, "colnames")

		for (let varName of Object.keys(data.varNames)) {
			let helpText = undefined
			if (varName === "uniquePairId") {
				helpText = "Set of variables that uniquely identifies a pair (pre/post vax) of titres"
			}
			const el = addEl(dataRelatedInputs, createSwitch({
				init: data.varNames[varName as keyof DataVarNames],
				opts: data.colnames,
				onUpdate: (sel) => {
					// @ts-ignore
					data.varNames[varName as keyof DataVarNames] = sel

					if (varName == "uniquePairId") {
						data.dataFull = data.dataFull.map(row => {
							row.__UNIQUEPID__ = constructStringFromCols(row, data.varNames.uniquePairId)
							return row
						})
						data.dataFiltered = data.dataFiltered.map(row => {
							row.__UNIQUEPID__ = constructStringFromCols(row, data.varNames.uniquePairId)
							return row
						})
					}

					regenPlot()
				},
				name: varName,
				helpText: helpText,
			}))
			el.style.marginBottom = collapsibleSelectorSpacing
		}
	}

	// NOTE(sen) Dev only for now
	let fetchString = ""
	try {
		const resp = await fetch("/vis2022.csv")
		if (resp.ok) {
			fetchString = await resp.text()
		}
	} catch (e) {}

	onNewDataString(fetchString)
}

main()

// TODO(sen) Compare rises to 4 and vaccine rise
// TODO(sen) Cohort vaccination split
// TODO(sen) Combine age groups
// TODO(sen) Combine labs
// TODO(sen) Configurable virus combinations

// NOTE(sen) To make this a "module"
export {}
