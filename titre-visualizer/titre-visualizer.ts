import { Papa } from "./papaparse.js"
import { VirtualizedList } from "./virtualized-list.js"
import * as Arr from "./array.ts"
import * as Rand from "./rand.ts"
import * as Plot from "./plot.ts"

const THEMES_ = ["dark", "light"] as const
const THEMES = THEMES_ as unknown as string[]
type Theme = typeof THEMES_[number]

const PLOT_MODES_ = ["titres", "rises"] as const
const PLOT_MODES = PLOT_MODES_ as unknown as string[]
type PlotMode = typeof PLOT_MODES_[number]

const PLOT_ELEMENTS_ = ["points", "lines", "boxplots", "counts", "refLine", "means", "bars"] as const
const PLOT_ELEMENTS = PLOT_ELEMENTS_ as unknown as string[]
type PlotElement = typeof PLOT_ELEMENTS_[number]
type Opacities = Record<PlotElement, number>

const DATA_FORMATS_ = ["wide", "long"] as const
const DATA_FORMATS = DATA_FORMATS_ as unknown as string[]
type DataFormat = typeof DATA_FORMATS_[number]

//
// SECTION Math
//

const getBoxplotStats = (arr: number[]): Plot.BoxplotStats | null => {
	let result: Plot.BoxplotStats | null = null
	if (arr.length > 0) {
		const arrSorted = arr.sort((x1, x2) => x1 - x2)
		const q25 = Arr.sortedAscQuantile(arrSorted, 0.25)
		const q75 = Arr.sortedAscQuantile(arrSorted, 0.75)
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
const isString = (val: any) => typeof val === "string" || val instanceof String
const isNumber = (val: any) => typeof val === "number"
const isFractional = (val: any) => isGood(val) && isNumber(val) && Math.round(val) !== val

//
// SECTION DOM
//

const getScrollbarWidths = () => {
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

const SCROLLBAR_WIDTHS = getScrollbarWidths()

const createEl = (name: string) => document.createElement(name)
const createDiv = () => createEl("div")
const addEl = (parent: HTMLElement, child: HTMLElement) => {
	parent.appendChild(child)
	return child
}
const addDiv = (parent: HTMLElement) => addEl(parent, createDiv())
const removeChildren = (el: HTMLElement) => {
	while (el.lastChild) {
		el.removeChild(el.lastChild)
	}
}

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
	init: OptType
	opts: SingleOpt[]
	onUpdate: (opt: OptType, fromLeft?: number) => void
	name?: string
	optElementStyle?: (optEl: HTMLElement, optVal: SingleOpt) => void
	optContainerStyle?: (container: HTMLElement) => void
	optElements?: HTMLElement[]
	horizontalGradient?: number | number[]
	helpText?: string
	singleNullable?: boolean
}

const createSwitch = <SingleOpt extends string | number, OptType extends SingleOpt | SingleOpt[]>(
	spec: SwitchSpec<SingleOpt, OptType>
) => {
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

		label.addEventListener("click", () => {
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

			help.addEventListener("click", () => {
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
		// @ts-ignore TODO(sen) fix
		currentSel = [...currentSel]
	}
	const isSelected = (opt: SingleOpt) => {
		// @ts-ignore TODO(sen) fix
		const result = (!multiple && opt === currentSel) || (multiple && (<SingleOpt[]>currentSel).includes(opt))
		return result
	}

	const allOptElements: HTMLElement[] = spec.optElements === undefined ? [] : spec.optElements
	for (let optIndex = 0; optIndex < spec.opts.length; optIndex++) {
		const opt = spec.opts[optIndex]
		const optElement = addDiv(optContainer)
		allOptElements.push(optElement)
		optElement.style.paddingTop = "5px"
		optElement.style.paddingBottom = "5px"
		optElement.style.cursor = "pointer"
		optElement.style.textAlign = "center"

		optElement.textContent = `${opt}`
		spec.optElementStyle?.(optElement, opt)

		const normalCol = "var(--color-background)"
		const hoverCol = "var(--color-background2)"
		const selectedCol = "var(--color-selected)"

		if (spec.horizontalGradient === undefined) {
			if (isSelected(opt)) {
				optElement.style.backgroundColor = selectedCol
			} else {
				optElement.style.backgroundColor = normalCol
			}

			optElement.addEventListener("mouseover", () => {
				if (!isSelected(opt)) {
					optElement.style.backgroundColor = hoverCol
				}
			})
			optElement.addEventListener("mouseout", () => {
				if (!isSelected(opt)) {
					optElement.style.backgroundColor = normalCol
				}
			})
		} else {
			// @ts-ignore TODO(sen) fix
			const fromLeft = spec.horizontalGradient[optIndex]
			const fromLeftPercent = Math.round(fromLeft * 100)
			optElement.style.background = `linear-gradient(to right, ${selectedCol} ${fromLeftPercent}%, ${normalCol} ${fromLeftPercent}%)`
		}

		optElement.addEventListener("click", (event) => {
			if (spec.horizontalGradient === undefined) {
				if (!multiple) {
					// @ts-ignore TODO(sen) fix
					if (opt !== currentSel) {
						for (const child of optContainer.childNodes) {
							const childHtml = child as HTMLElement
							childHtml.style.backgroundColor = normalCol
						}
						optElement.style.backgroundColor = selectedCol
						// @ts-ignore TODO(sen) fix
						currentSel = opt
					} else if (spec.singleNullable) {
						optElement.style.backgroundColor = normalCol
						//@ts-ignore TODO(sen) fix
						currentSel = null
					}
				} else if (multiple) {
					if (event.ctrlKey) {
						allOptElements.map((optEl) => (optEl.style.backgroundColor = normalCol))
						optElement.style.backgroundColor = selectedCol
						// @ts-ignore TODO(sen) fix
						currentSel = [opt]
					} else if (event.shiftKey) {
						allOptElements.map((optEl) => (optEl.style.backgroundColor = selectedCol))
						// @ts-ignore TODO(sen) fix
						currentSel = [...spec.opts]
					} else {
						const optIndex = (<SingleOpt[]>currentSel).indexOf(opt)
						if (optIndex) {
							optElement.style.backgroundColor = normalCol
							Arr.removeIndex(<SingleOpt[]>currentSel, optIndex)
						} else {
							optElement.style.backgroundColor = selectedCol
							;(<SingleOpt[]>currentSel).push(opt)
						}
					}
				}

				spec.onUpdate(currentSel)
			} else {
				// @ts-ignore TODO(sen) fix
				let fromLeft = event.offsetX / event.target!.offsetWidth
				if (event.ctrlKey) {
					fromLeft = 0
				} else if (event.shiftKey) {
					fromLeft = 1
				}
				const fromLeftPercent = Math.round(fromLeft * 100)
				optElement.style.background = `linear-gradient(to right, ${selectedCol} ${fromLeftPercent}%, ${normalCol} ${fromLeftPercent}%)`
				// @ts-ignore TODO(sen) fix
				spec.onUpdate(opt, fromLeft)
			}
		})
	}

	return switchElement
}

//
// SECTION Plots
//

const MISSING_STRING = "(missing)"

const virusSort = (v1: string, v2: string) => {
	let result = 0

	if (v1.startsWith("A") && v2.startsWith("B")) {
		result = -1
	} else if (v2.startsWith("A") && v1.startsWith("B")) {
		result = 1
	}

	if (result === 0) {
		const yearPat = /(\d{4})e?$/
		const year1 = yearPat.exec(v1)?.[1]
		const year2 = yearPat.exec(v2)?.[1]
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

const getSorter = (varName: string, varNames: DataVarNames) =>
	varName === varNames.virus ? virusSort : Arr.generalSort

type PlotSettings = {
	xFacets: string[]
	xAxis: string
	refTitre: number
	refRatio: number
	refRelative: number
	theme: Theme
	opacities: Opacities
	kind: PlotMode
	relative: boolean
	refVirus: string
	refType: "manual" | "data"
}

const FACET_LABEL_SEP = "; "

const createPlot = (data: Data, settings: PlotSettings, boxplotData: any[]) => {
	const xFacetValsAll = Arr.expandGrid(
		settings.xFacets.map((xFacet) =>
			Arr.unique(data.dataFiltered.map((row) => row[xFacet] as any)).sort(getSorter(xFacet, data.varNames))
		)
	).map((vals: any) => vals.join(FACET_LABEL_SEP))
	const xFacetVals: string[] = []
	const xTicksPerFacet =
		xFacetValsAll.length > 0
			? xFacetValsAll
					.map((xFacetVal: any) => {
						const dataFacet = data.dataFiltered.filter((row) => row.__XFACET__ === xFacetVal)
						const facetXTicks = Arr.unique(dataFacet.map((row) => row[settings.xAxis] as any)).sort(
							getSorter(settings.xAxis, data.varNames)
						)
						if (dataFacet.length > 0) {
							xFacetVals.push(xFacetVal)
						}
						return facetXTicks
					})
					.filter((arr: any) => arr.length > 0)
			: [
					Arr.unique(data.dataFiltered.map((row) => row[settings.xAxis] as any)).sort(
						getSorter(settings.xAxis, data.varNames)
					),
			  ]

	const referenceTitres: Record<string, { pre: number | null; post: number | null }> = {}
	const pidVirusTimepointTitres: Record<string, Record<string, { pre: number | null; post: number | null }>> = {}
	if (settings.relative) {
		const allpids = Arr.unique(data.dataFull.map((row) => row.__UNIQUEPID__))
		for (const pid of allpids) {
			const pidData = data.dataFull.filter((row) => row.__UNIQUEPID__ === pid)
			const viruses = Arr.unique(pidData.map((row) => row[data.varNames.virus]))
			pidVirusTimepointTitres[pid] = {}
			for (const virus of viruses) {
				pidVirusTimepointTitres[pid][virus] = { pre: null, post: null }
				const pidVirusData = pidData.filter((row) => row[data.varNames.virus] == virus)
				let preTitres = []
				let postTitres = []
				const varNames = data.varNames
				switch (varNames.format) {
					case "long":
						preTitres = pidVirusData
							.filter((row) => row[varNames.timepoint] == varNames.timepointLabels.pre)
							.map((row) => row[varNames.titre])
						postTitres = pidVirusData
							.filter((row) => row[varNames.timepoint] == varNames.timepointLabels.post)
							.map((row) => row[varNames.titre])
						break
					case "wide":
						preTitres = pidVirusData.map((row) => row[varNames.preTitre])
						postTitres = pidVirusData.map((row) => row[varNames.postTitre])
						break
				}
				// TODO(sen) Some sort of warining here when length > 1
				// that we couldn't uniquely identify an individual
				if (preTitres.length === 1) {
					pidVirusTimepointTitres[pid][virus].pre = <number>preTitres[0]
				}
				if (postTitres.length === 1) {
					pidVirusTimepointTitres[pid][virus].post = <number>postTitres[0]
				}
			}
			const pidReferenceTitres = pidData.filter((row) => row[data.varNames.virus] === settings.refVirus)
			let preTitres = []
			let postTitres = []
			const varNames = data.varNames
			switch (varNames.format) {
				case "long":
					preTitres = pidReferenceTitres
						.filter((row) => row[varNames.timepoint] == varNames.timepointLabels.pre)
						.map((row) => row[varNames.titre])
					postTitres = pidReferenceTitres
						.filter((row) => row[varNames.timepoint] == varNames.timepointLabels.post)
						.map((row) => row[varNames.titre])
					break
				case "wide":
					preTitres = pidReferenceTitres.map((row) => row[varNames.preTitre])
					postTitres = pidReferenceTitres.map((row) => row[varNames.postTitre])
					break
			}
			referenceTitres[pid] = { pre: null, post: null }
			// TODO(sen) Some sort of warining here when length > 1
			// that we couldn't uniquely identify an individual
			if (preTitres.length === 1) {
				referenceTitres[pid].pre = <number>preTitres[0]
			}
			if (postTitres.length === 1) {
				referenceTitres[pid].post = <number>postTitres[0]
			}
		}
	}

	const plot = Plot.beginPlot({
		widthTick: 50,
		heightTick: 30,
		scaleXData: (xVal, xFacetIndex) => xTicksPerFacet[xFacetIndex].indexOf(xVal),
		scaleYData: settings.relative ? (x) => x : Math.log,
		padAxis: { l: 100, t: 50, r: 50, b: 150 },
		padData: { l: 40, t: 20, r: 40, b: 20 },
		padFacet: 80,
		scaledXMinPerFacet: xTicksPerFacet.map(() => 0),
		scaledXMaxPerFacet: xTicksPerFacet.map((ticks: any[]) => ticks.length - 1),
		yMin: settings.relative ? 0 : settings.kind === "titres" ? 5 : 0.25,
		yMax: settings.relative ? 5 : settings.kind === "titres" ? 5120 : 256,
		xTicksPerFacet: xTicksPerFacet,
		yTicks: settings.relative
			? [0, 0.5, 1, 2, 3, 4, 5]
			: settings.kind === "titres"
			? [5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120]
			: [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256],
		xFacetVals: xFacetVals,
		xLabel: "",
		yLabel: settings.kind === "titres" ? "Titre" : "Rises",
		theme: settings.theme,
	})

	// NOTE(sen) Reference line
	{
		const yCoord = plot.scaleYToPx(
			settings.relative
				? settings.refRelative
				: settings.kind === "titres"
				? settings.refTitre
				: settings.refRatio
		)
		const color = plot.axisColor + Plot.colorChannel255ToString(settings.opacities.refLine)
		const thickness = 1
		Plot.drawLine(
			plot.renderer,
			plot.spec.padAxis.l,
			yCoord,
			plot.totalWidth - plot.spec.padAxis.r,
			yCoord,
			color,
			thickness,
			[]
		)
	}

	for (let xFacetIndex = 0; xFacetIndex < Math.max(xFacetVals.length, 1); xFacetIndex++) {
		const xFacetVal = xFacetVals[xFacetIndex]
		const xTicksForFacet = xTicksPerFacet[xFacetIndex]

		for (const xTick of xTicksForFacet) {
			const stripData = data.dataFiltered.filter((row) => {
				let result = row[settings.xAxis] === xTick
				if (settings.xFacets.length > 0) {
					result = result && row.__XFACET__ === xFacetVal
				}

				const varNames = data.varNames
				switch (varNames.format) {
					case "long":
						result = result && isGood(row[varNames.titre])
						break
					case "wide":
						result = result && isGood(row[varNames.preTitre]) && isGood(row[varNames.postTitre])
						break
				}

				return result
			})
			const pids = Arr.unique(stripData.map((row) => row.__UNIQUEPID__))
			const stripXCoord = plot.scaleXToPx(xTick, xFacetVal)

			const leftRightStep = plot.spec.widthTick / 4
			const preColor = "#308A36"
			const postColor = "#7FA438"

			const preXCoord = stripXCoord - leftRightStep
			const postXCoord = stripXCoord + leftRightStep

			const pointSize = 2
			const lineSize = 1
			const pointAlphaStr = Plot.colorChannel255ToString(settings.opacities.points)
			const lineAlphaStr = Plot.colorChannel255ToString(settings.opacities.lines)
			const preColorWithAlpha = preColor + pointAlphaStr
			const postColorWithAlpha = postColor + pointAlphaStr
			const preColorWithAlphaLine = preColor + lineAlphaStr

			const adjacentDistance = plot.spec.widthTick - leftRightStep * 2
			const jitterMaxX = adjacentDistance / 4
			const jitterMaxY = plot.spec.heightTick / 4

			// NOTE(sen) Points and lines connecting them
			let scaledPreTitres: number[] = []
			let scaledPostTitres: number[] = []
			const scaledRatios: number[] = []
			const varNames = data.varNames
			switch (varNames.format) {
				case "long":
					{
						const preData = stripData.filter(
							(row) => row[varNames.timepoint] === varNames.timepointLabels.pre
						)
						const postData = stripData.filter(
							(row) => row[varNames.timepoint] === varNames.timepointLabels.post
						)
						for (const pid of pids) {
							const pre = preData.filter((row) => row.__UNIQUEPID__ === pid)
							const post = postData.filter((row) => row.__UNIQUEPID__ === pid)
							const refViruses = Arr.unique(
								Arr.unique(pre.map((row) => row[data.varNames.reference])).concat(
									Arr.unique(post.map((row) => row[data.varNames.reference]))
								)
							)

							let preTitres = pre.map((row) => row[varNames.titre] as number)
							let postTitres = post.map((row) => row[varNames.titre] as number)
							if (settings.relative) {
								if (settings.refType === "manual" || refViruses.length === 1) {
									let reference = referenceTitres[pid]
									if (settings.refType == "data") {
										const refVirus = refViruses[0]
										reference = pidVirusTimepointTitres[pid][refVirus]
									}
									if (reference !== undefined) {
										if (reference.pre !== null) {
											preTitres = preTitres.map((titre) => titre / <number>reference.pre)
										} else {
											preTitres = []
										}

										if (reference.post !== null) {
											postTitres = postTitres.map((titre) => titre / <number>reference.post)
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

								const preYTitresScaled = preTitres.map((titre) => plot.spec.scaleYData(titre))
								const postYTitresScaled = postTitres.map((titre) => plot.spec.scaleYData(titre))

								scaledPreTitres = scaledPreTitres.concat(preYTitresScaled)
								scaledPostTitres = scaledPostTitres.concat(postYTitresScaled)

								const preYCoords = preYTitresScaled.map(
									(titre) => plot.scaleScaledYToPx(titre) + jitterY
								)
								const postYCoords = postYTitresScaled.map(
									(titre) => plot.scaleScaledYToPx(titre) + jitterY
								)

								for (const preYCoord of preYCoords) {
									Plot.drawPoint(plot.renderer, preXCoordJit, preYCoord, pointSize, preColorWithAlpha)
								}
								for (const postYCoord of postYCoords) {
									Plot.drawPoint(
										plot.renderer,
										postXCoordJit,
										postYCoord,
										pointSize,
										postColorWithAlpha
									)
								}

								if (preYCoords.length === 1 && postYCoords.length === 1) {
									Plot.drawLine(
										plot.renderer,
										preXCoordJit,
										preYCoords[0],
										postXCoordJit,
										postYCoords[0],
										preColorWithAlphaLine,
										lineSize,
										[]
									)
								}
							} else if (preTitres.length === 1 && postTitres.length === 1) {
								const scaledRatio = plot.spec.scaleYData(postTitres[0] / preTitres[0])
								scaledRatios.push(scaledRatio)
								const yCoord = plot.scaleScaledYToPx(scaledRatio) + jitterY
								Plot.drawPoint(
									plot.renderer,
									stripXCoord + jitterX,
									yCoord,
									pointSize,
									preColorWithAlpha
								)
							}
						}
					}
					break

				case "wide":
					for (const pid of pids) {
						const pidData = stripData.filter((row) => row.__UNIQUEPID__ === pid)
						const refViruses = Arr.unique(pidData.map((row) => row[data.varNames.reference]))
						for (const row of pidData) {
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
									Plot.drawPoint(
										plot.renderer,
										preXCoordJit,
										preYCoordJit,
										pointSize,
										preColorWithAlpha
									)
								}

								let postXCoordJit = 0
								let postYCoordJit = 0
								if (isGood(postTitre)) {
									const scaledPostTitre = plot.spec.scaleYData(<number>postTitre)
									scaledPostTitres.push(scaledPostTitre)
									const postYCoord = plot.scaleScaledYToPx(scaledPostTitre)
									postXCoordJit = postXCoord + jitterX
									postYCoordJit = postYCoord + jitterY
									Plot.drawPoint(
										plot.renderer,
										postXCoordJit,
										postYCoordJit,
										pointSize,
										postColorWithAlpha
									)
								}

								if (isGood(preTitre) && isGood(postTitre)) {
									Plot.drawLine(
										plot.renderer,
										preXCoordJit,
										preYCoordJit,
										postXCoordJit,
										postYCoordJit,
										preColorWithAlphaLine,
										lineSize,
										[]
									)
								}
							} else if (isGood(preTitre) && isGood(postTitre)) {
								const scaledRatio = plot.spec.scaleYData(<number>postTitre / <number>preTitre)
								scaledRatios.push(scaledRatio)
								const yCoord = plot.scaleScaledYToPx(scaledRatio) + jitterY
								Plot.drawPoint(
									plot.renderer,
									stripXCoord + jitterX,
									yCoord,
									pointSize,
									preColorWithAlpha
								)
							}
						}
					}
					break
			}

			const altColor = settings.theme === "dark" ? "#000000" : "#ffffff"

			// NOTE(sen) Boxplots
			const boxWidth = leftRightStep
			const boxLineThiccness = 2

			const addVarsToBoxplotStats = (stats: Plot.BoxplotStats) => {
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
					Plot.addVBar(
						plot,
						plot.scaleScaledYToPx(preStats.mean),
						boxPreXCoord,
						boxWidth,
						preColor,
						settings.opacities.bars
					)

					Plot.addBoxplot(
						plot,
						preStats,
						boxPreXCoord,
						boxWidth,
						preColor,
						altColor,
						boxLineThiccness,
						settings.opacities.boxplots,
						settings.opacities.means
					)
					addVarsToBoxplotStats(preStats)
					;(<any>preStats).timepoint = "pre"
					boxplotData.push(preStats)
				}

				if (postStats !== null) {
					Plot.addVBar(
						plot,
						plot.scaleScaledYToPx(postStats.mean),
						boxPostXCoord,
						boxWidth,
						postColor,
						settings.opacities.bars
					)

					Plot.addBoxplot(
						plot,
						postStats,
						boxPostXCoord,
						boxWidth,
						postColor,
						altColor,
						boxLineThiccness,
						settings.opacities.boxplots,
						settings.opacities.means
					)
					addVarsToBoxplotStats(postStats)
					;(<any>postStats).timepoint = "post"
					boxplotData.push(postStats)
				}
			} else if (scaledRatios.length > 0) {
				const ratioStats = getBoxplotStats(scaledRatios)
				if (ratioStats !== null) {
					Plot.addVBar(
						plot,
						plot.scaleScaledYToPx(ratioStats.mean),
						stripXCoord,
						boxWidth,
						preColor,
						settings.opacities.bars
					)
					Plot.addBoxplot(
						plot,
						ratioStats,
						stripXCoord,
						boxWidth,
						preColor,
						altColor,
						boxLineThiccness,
						settings.opacities.boxplots,
						settings.opacities.means
					)
					addVarsToBoxplotStats(ratioStats)
					boxplotData.push(ratioStats)
				}
			}

			// NOTE(sen) Counts
			{
				const yCoord = plot.scaleYToPx(plot.spec.yTicks[plot.spec.yTicks.length - 1])
				const alphaStr = Plot.colorChannel255ToString(settings.opacities.counts)

				if (settings.kind === "titres") {
					if (scaledPreTitres.length > 0) {
						Plot.drawText(
							plot.renderer,
							`${scaledPreTitres.length}`,
							boxPreXCoord,
							yCoord,
							preColor + alphaStr,
							-90,
							"middle",
							"center",
							altColor + alphaStr
						)
					}

					if (scaledPostTitres.length > 0) {
						Plot.drawText(
							plot.renderer,
							`${scaledPostTitres.length}`,
							boxPostXCoord,
							yCoord,
							postColor + alphaStr,
							-90,
							"middle",
							"center",
							altColor + alphaStr
						)
					}
				} else if (scaledRatios.length > 0) {
					Plot.drawText(
						plot.renderer,
						`${scaledRatios.length}`,
						stripXCoord,
						yCoord,
						preColor + alphaStr,
						-90,
						"middle",
						"center",
						altColor + alphaStr
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

const globalResizeListeners: any[] = []

const createTableFilterRow = <T>(colSpec: { [key: string]: TableColSpecFinal<T> }, onInput: any) => {
	const filterRow = createDiv()
	applyTableHeaderRowStyle(filterRow)

	let rowWidth = 0 //SCROLLBAR_WIDTHS[1]
	let colnameIndex = 0
	for (const colname of Object.keys(colSpec)) {
		const colWidthPx = colSpec[colname].width
		rowWidth += colWidthPx
		const cellContainer = addDiv(filterRow)
		applyCellContainerStyle(cellContainer, colWidthPx)
		cellContainer.style.position = "relative"

		const questionMarkWidth = 20

		const cell = <HTMLInputElement>addEl(cellContainer, createEl("input"))
		cell.type = "text"
		cell.autocomplete = "off"
		cell.placeholder = "Filter..."
		cell.style.width = colWidthPx - questionMarkWidth + "px"
		cell.style.boxSizing = "border-box"
		cell.addEventListener("input", (event) => {
			onInput(colname, (<HTMLTextAreaElement>event.target).value)
		})

		const questionMark = addDiv(cellContainer)
		questionMark.style.padding = "2px"
		questionMark.style.width = questionMarkWidth + "px"
		questionMark.style.textAlign = "center"
		questionMark.style.cursor = "pointer"
		questionMark.textContent = "?"

		const helpText =
			"Case-sensitive. Supports regular expressions (e.g. ^male). For numbers, you can type >x and <x (e.g. >40)"
		const helpEl = createDiv()
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

const createTableHeaderRow = <T>(colSpec: { [key: string]: TableColSpecFinal<T> }) => {
	const headerRow = createDiv()
	applyTableHeaderRowStyle(headerRow)

	let rowWidth = 0 //SCROLLBAR_WIDTHS[1]
	for (const colname of Object.keys(colSpec)) {
		const colWidthPx = colSpec[colname].width
		rowWidth += colWidthPx
		const cell = addDiv(headerRow)
		applyCellContainerStyle(cell, colWidthPx)
		cell.textContent = colname
	}

	headerRow.style.width = rowWidth + "px"
	return headerRow
}

const createTableCell = (widthPx: number) => {
	const cellElement = createEl("td")
	cellElement.style.width = widthPx + "px"
	cellElement.style.textAlign = "center"
	cellElement.style.verticalAlign = "middle"
	cellElement.style.whiteSpace = "nowrap"
	return cellElement
}

const createTableCellString = (widthPx: number, string: string) => {
	const cellElement = createTableCell(widthPx)
	cellElement.textContent = string
	if (string === MISSING_STRING) {
		cellElement.style.color = "var(--color-text-muted)"
	}
	return cellElement
}

const createTableTitle = (title: string, downloadable: boolean) => {
	const titleElement = createDiv()
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

		titleElement.addEventListener("click", () => {
			const csv = DOWNLOAD_CSV[title]
			if (csv) {
				const hidden = <HTMLLinkElement>createEl("a")
				hidden.href = "data:text/csv;charset=utf-8," + encodeURI(csv)
				hidden.target = "_blank"
				// @ts-ignore TODO(sen) Fix
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
	const result = tableHeight - TABLE_ROW_HEIGHT_PX * 3
	return result
}

const createTableBodyContainer = (tableHeight: number) => {
	const tableBodyContainer = createDiv()
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
	const rowElement = createEl("tr")
	rowElement.style.height = TABLE_ROW_HEIGHT_PX + "px"
	rowElement.style.backgroundColor = getTableRowBackgroundColor(rowIndex)
	return rowElement
}

type TableColSpec<RowType> = {
	access?: ((row: RowType) => any) | string
	format?: (val: any) => string
	width?: number
	filter?: (row: RowType, val: any) => boolean
	filterValProcess?: (val: string) => string
}

type TableColSpecFinal<RowType> = {
	access: (row: RowType) => any
	format: (val: any) => string
	width: number
	filter: (row: RowType, val: string) => boolean
	filterVal: string
	filterValProcess: (val: string) => string
}

const createTableElementFromAos = <RowType extends { [key: string]: any }>({
	aos,
	colSpecInit,
	defaults,
	title,
	forRow,
	getTableHeightInit,
	onFilterChange,
}: {
	aos: RowType[]
	colSpecInit: { [key: string]: TableColSpec<RowType> }
	title: string
	defaults?: TableColSpec<RowType>
	forRow?: (row: RowType) => void
	getTableHeightInit?: () => number
	onFilterChange?: (filteredData: RowType[]) => void
}) => {
	const getTableHeight = getTableHeightInit ?? (() => window.innerHeight - SCROLLBAR_WIDTHS[0])

	const table = createDiv()
	table.style.maxWidth = "100%"
	addEl(table, createTableTitle(title, true))
	DOWNLOAD_CSV[title] = ""

	const colnames = Object.keys(colSpecInit)
	DOWNLOAD_CSV[title] += colnames.join(",") + "\n"

	// NOTE(sen) Fill in missing spec entries
	const colSpec: { [key: string]: TableColSpecFinal<RowType> } = {}
	for (const colname of colnames) {
		const specInit = colSpecInit[colname]

		let accessInit = specInit.access ?? defaults?.access ?? colname
		if (isString(accessInit)) {
			const colname = <string>accessInit
			accessInit = (rowData) => rowData[colname]
		}

		const access = <(row: RowType) => any>accessInit
		const format = (x: any) => {
			let result = MISSING_STRING
			if (x !== undefined && x !== null && x !== "undefined") {
				const formatTest = specInit.format ?? defaults?.format
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
			filter:
				specInit.filter ??
				defaults?.filter ??
				((row, val) => {
					const data = access(row)
					const formattedData = format(data)
					let passed = true

					if ((val.startsWith(">") || val.startsWith("<")) && isNumber(data)) {
						const valNumber = parseFloat(val.slice(1))
						if (!isNaN(valNumber)) {
							switch (val[0]) {
								case ">":
									passed = data >= valNumber
									break
								case "<":
									passed = data <= valNumber
									break
							}
						}
					} else {
						try {
							const re = new RegExp(val)
							const reResult = formattedData.search(re)
							passed = reResult !== -1
						} catch (_error) {
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
	for (const colname of colnames) {
		tableWidthPx += colSpec[colname].width
	}

	let regenBody = () => {}

	if (aos.length > 0) {
		const hscrollContainer = addDiv(table)
		hscrollContainer.style.overflowX = "scroll"
		hscrollContainer.style.boxSizing = "border-box"
		hscrollContainer.style.borderLeft = "1px solid var(--color-border)"
		hscrollContainer.style.borderRight = "1px solid var(--color-border)"

		addEl(hscrollContainer, createTableHeaderRow(colSpec))
		addEl(
			hscrollContainer,
			createTableFilterRow(colSpec, (colname: string, filterVal: any) => {
				colSpec[colname].filterVal = colSpec[colname].filterValProcess(filterVal)
				aosFiltered = getAosFiltered()
				virtualizedList.setRowCount(aosFiltered.length)
			})
		)

		let tableBodyHeight = getTableBodyHeight(getTableHeight())
		const tableBodyContainer = addEl(hscrollContainer, createTableBodyContainer(getTableHeight()))
		tableBodyContainer.style.width = tableWidthPx + "px"

		const getAosFiltered = () => {
			const aosFiltered: RowType[] = []
			for (let rowIndex = 0; rowIndex < aos.length; rowIndex += 1) {
				const rowData = aos[rowIndex]

				let passedColFilters = true
				for (const otherColname of colnames) {
					const spec = colSpec[otherColname]
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
				const rowData = aosFiltered[rowIndex]
				const rowElement = createTableDataRow(rowIndex)

				for (const colname of colnames) {
					const spec = colSpec[colname]
					const colData = spec.access(rowData)
					const colDataFormatted = spec.format(colData)
					const width = spec.width - SCROLLBAR_WIDTHS[1] / colnames.length
					addEl(rowElement, createTableCellString(width, colDataFormatted))
				}

				return rowElement
			},
			estimatedRowHeight: TABLE_ROW_HEIGHT_PX,
			rowHeight: TABLE_ROW_HEIGHT_PX,
		})

		regenBody = () => {
			const newTableBodyHeight = getTableBodyHeight(getTableHeight())
			if (newTableBodyHeight != tableBodyHeight) {
				tableBodyHeight = newTableBodyHeight
				tableBodyContainer.style.maxHeight = newTableBodyHeight + "px"
				virtualizedList.resize(newTableBodyHeight)
			}
		}

		for (let rowIndex = 0; rowIndex < aos.length; rowIndex += 1) {
			const rowData = aos[rowIndex]

			for (const colname of colnames) {
				const spec = colSpec[colname]
				const colData = spec.access(rowData)
				const colDataFormatted = spec.format(colData)
				DOWNLOAD_CSV[title] += '"' + colDataFormatted + '",'
			}

			DOWNLOAD_CSV[title] += "\n"
			forRow?.(rowData)
		}
	}

	globalThis.window.addEventListener("resize", regenBody)
	globalResizeListeners.push(regenBody)

	return table
}

//
// SECTION Data and main
//

type TimepointLabels = {
	pre: string
	post: string
}

type DataVarNamesLong = {
	format: "long"
	virus: string
	reference: string
	uniquePID: string[]
	timepoint: string
	titre: string
	timepointLabels: TimepointLabels
}

type DataVarNamesWide = {
	format: "wide"
	virus: string
	reference: string
	preTitre: string
	postTitre: string
	uniquePID: string[] // NOTE(sen) Need for relative titres
}

type DataVarNames = DataVarNamesLong | DataVarNamesWide

type Data = {
	dataFull: Record<string, string | number>[]
	dataFiltered: Record<string, string | number>[]
	varNames: DataVarNames
	colnames: string[]
}

const DEFAULT_DATA_VAR_NAMES: DataVarNamesLong = {
	format: "long",
	uniquePID: ["pid", "cohort", "vaccine", "serum_source", "testing_lab"],
	timepoint: "timepoint",
	titre: "titre",
	virus: "virus",
	reference: "reference_cell",
	timepointLabels: { pre: "Pre-vax", post: "Post-vax" },
}

const DEFAULT_DATA_VAR_NAMES_WIDE: DataVarNamesWide = {
	format: "wide",
	preTitre: "preTitre",
	postTitre: "postTitre",
	virus: "virus",
	reference: "reference_cell",
	uniquePID: [
		"year",
		"hemisphere",
		"flu_set",
		"test_type",
		"testing_lab",
		"location",
		"serum_lab",
		"cohort",
		"strain",
		"passage",
		"subject_id",
		"vaccine",
	],
}

const guessDataVarNames = (existingNames: string[]) => {
	const colsWithTitre: string[] = []
	const colsWithVirus: string[] = []
	const colsWithReference: string[] = []
	const colsWithStrain: string[] = []
	const colsWithPassage: string[] = []
	for (const name of existingNames) {
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
		case "wide":
			{
				let preTitre = colsWithTitre[0]
				let postTitre = colsWithTitre[1]
				for (const name of colsWithTitre) {
					const lowerName = name.toLowerCase()
					if (lowerName.includes("pre")) {
						preTitre = name
					}
					if (lowerName.includes("post")) {
						postTitre = name
					}
				}

				const uniquePidCols = []
				for (const colname of existingNames) {
					if (
						colname !== preTitre &&
						colname !== postTitre &&
						!colsWithVirus.includes(colname) &&
						!colsWithReference.includes(colname) &&
						!colsWithStrain.includes(colname) &&
						!colsWithPassage.includes(colname)
					) {
						uniquePidCols.push(colname)
					}
				}
				varNames = {
					format: "wide",
					preTitre: preTitre,
					postTitre: postTitre,
					virus: colsWithVirus[0],
					reference: colsWithReference[0],
					uniquePID: uniquePidCols,
				}
			}
			break

		case "long":
			{
				varNames = { ...DEFAULT_DATA_VAR_NAMES }
				varNames.virus = colsWithVirus[0]
				for (const testName of varNames.uniquePID) {
					if (!existingNames.includes(testName)) {
						Arr.removeIndex(varNames.uniquePID, varNames.uniquePID.indexOf(testName))
					}
				}
				for (const existingName of existingNames) {
					if (existingName.toLowerCase().endsWith("id") && !varNames.uniquePID.includes(existingName)) {
						varNames.uniquePID.push(existingName)
					}
				}
			}
			break
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

	const parseResult = Papa.parse(input, { skipEmptyLines: true, dynamicTyping: true })

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
					const row: Record<string, string | number> = {}
					for (let colnameIndex = 0; colnameIndex < data.colnames.length; colnameIndex++) {
						const colname = data.colnames[colnameIndex]
						const value = parsedRow[colnameIndex]
						row[colname] = value
					}
					row.__UNIQUEPID__ = constructStringFromCols(row, data.varNames.uniquePID)
					row.__XFACET__ = constructStringFromCols(row, xFacets, FACET_LABEL_SEP)
					data.dataFull.push(row)

					switch (varNames.format) {
						case "long":
							{
								const titre = row[varNames.titre]
								anyTitreIsFractional = anyTitreIsFractional || isFractional(titre)
								anyTitreIsBelow5 = anyTitreIsBelow5 || <number>titre < 5
							}
							break

						case "wide":
							{
								const preTitre = row[varNames.preTitre]
								const postTitre = row[varNames.postTitre]
								anyTitreIsFractional =
									anyTitreIsFractional || isFractional(preTitre) || isFractional(postTitre)
								anyTitreIsBelow5 = anyTitreIsBelow5 || <number>preTitre < 5 || <number>postTitre < 5
							}
							break
					}
				}
			}

			const titreIsIndex = !anyTitreIsFractional && anyTitreIsBelow5
			const titreIndexToOg = (val: number) => 5 * 2 ** val

			switch (varNames.format) {
				case "long":
					{
						if (titreIsIndex) {
							data.dataFull = data.dataFull.map((row) => {
								row[varNames.titre] = titreIndexToOg(<number>row[varNames.titre])
								return row
							})
						}

						const allTimepointLabels = Arr.unique(
							data.dataFull.map((row) => row[varNames.timepoint])
						).filter((lbl: any) => lbl !== undefined && lbl !== null) as string[]
						for (const timepointLabel of allTimepointLabels) {
							if (timepointLabel.toLowerCase().includes("pre")) {
								varNames.timepointLabels.pre = timepointLabel
							} else if (timepointLabel.toLowerCase().includes("post")) {
								varNames.timepointLabels.post = timepointLabel
							}
						}
					}
					break

				case "wide":
					{
						if (titreIsIndex) {
							data.dataFull = data.dataFull.map((row) => {
								row[varNames.postTitre] = titreIndexToOg(<number>row[varNames.postTitre])
								row[varNames.preTitre] = 5 * 2 ** <number>row[varNames.preTitre]
								return row
							})
						}
					}
					break
			}
		}
	}

	data.dataFiltered = [...data.dataFull]
	return data
}

const main = () => {
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
		xFacets: [],
		xAxis: data.varNames.virus,
		refTitre: 40,
		refRatio: 4,
		refRelative: 0.5,
		theme: "dark",
		opacities: { points: 0.5, lines: 0.1, boxplots: 1, counts: 1, refLine: 1, means: 1, bars: 0 },
		kind: "titres",
		relative: false,
		refVirus: "A/Victoria/2570/2019e",
		refType: "manual",
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
			const scaledNewRef = Plot.scale(event.offsetY, plot.metrics.b, plot.metrics.t, scaledYMin, scaledYMax)
			if (scaledNewRef >= scaledYMin && scaledNewRef <= scaledYMax) {
				if (plotSettings.relative) {
					plotSettings.refRelative = scaledNewRef
				} else {
					const newRef = Math.exp(scaledNewRef)
					switch (plotSettings.kind) {
						case "titres":
							{
								plotSettings.refTitre = newRef
							}
							break
						case "rises":
							{
								plotSettings.refRatio = newRef
							}
							break
					}
				}
				regenPlot()
			}
		})

		const logFormat = plotSettings.relative ? (x: number) => x.toFixed(2) : (x: number) => Math.exp(x).toFixed(0)

		const cols: any = {}
		for (const varname of plotSettings.xFacets) {
			cols[varname] = {}
		}
		cols[plotSettings.xAxis] = { width: 200, access: "xTick" }
		if (plotSettings.kind === "titres") {
			cols.timepoint = {}
		}
		cols.mean = { format: logFormat }
		cols.meanLow95 = { format: logFormat, access: "meanLow" }
		cols.meanHigh95 = { format: logFormat, access: "meanHigh" }
		cols.min = { format: logFormat }
		cols.max = { format: logFormat }
		cols.q25 = { format: logFormat }
		cols.q75 = { format: logFormat }
		cols.median = { format: logFormat }

		removeChildren(tableParent)
		addEl(
			tableParent,
			createTableElementFromAos({
				aos: plotBoxplotData,
				colSpecInit: cols,
				title: plotSettings.kind === "titres" ? "GMT" : "GMR",
				getTableHeightInit: () => Math.max(window.innerHeight - plot.totalHeight - SCROLLBAR_WIDTHS[0], 300),
			})
		)
	}

	const onNewDataString = (contentsString: string) => {
		if (contentsString.length > 0) {
			data = parseData(contentsString, plotSettings.xFacets)
			if (!data.colnames.includes(plotSettings.xAxis)) {
				plotSettings.xAxis = data.varNames.virus
			}
			const viruses = Arr.unique(data.dataFull.map((x) => x[data.varNames.virus]))
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

	globalThis.window.addEventListener("dragenter", () => (fileInputWholePage.style.visibility = "visible"))
	fileInputWholePage.addEventListener("dragleave", () => (fileInputWholePage.style.visibility = "hidden"))

	addEl(
		inputContainer,
		createSwitch({
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
			},
		})
	)

	addEl(
		inputContainer,
		createSwitch({
			init: plotSettings.kind,
			opts: <PlotMode[]>PLOT_MODES,
			onUpdate: () => {
				plotSettings.kind = plotSettings.kind === "titres" ? "rises" : "titres"
				regenPlot()
			},
			optElementStyle: switchOptionStyleAllCaps,
			optContainerStyle: (el) => {
				el.style.display = "flex"
				el.style.flexDirection = "row"
				el.style.marginBottom = "20px"
			},
		})
	)

	addEl(
		inputContainer,
		createSwitch({
			init: plotSettings.relative ? "Rel" : "Abs",
			opts: ["Abs", "Rel"],
			onUpdate: (rel) => {
				plotSettings.relative = rel === "Rel"
				if (plotSettings.relative) {
					regenReferenceSwitch()
				} else {
					removeChildren(referenceSwitchContainer)
				}
				regenPlot()
			},
			optElementStyle: switchOptionStyleAllCaps,
			optContainerStyle: (el) => {
				el.style.display = "flex"
				el.style.flexDirection = "row"
				el.style.marginBottom = "20px"
			},
		})
	)

	const collapsibleSelectorSpacing = "10px"

	const referenceSwitchContainer = addDiv(inputContainer)
	const regenReferenceSwitch = () => {
		const allViruses = Arr.unique(data.dataFiltered.map((row) => <string>row[data.varNames.virus])).sort(virusSort)
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

	const refTypeSwitch = addEl(
		inputContainer,
		createSwitch({
			init: plotSettings.refType,
			opts: ["manual", "data"],
			onUpdate: (refType) => {
				plotSettings.refType = refType
				regenPlot()
			},
			name: "Relative mode",
		})
	)
	refTypeSwitch.style.marginBottom = collapsibleSelectorSpacing

	const opacitiesSwitch = addEl(
		inputContainer,
		createSwitch({
			init: <PlotElement[]>PLOT_ELEMENTS,
			opts: <PlotElement[]>PLOT_ELEMENTS,
			onUpdate: (el, fromLeft) => {
				// @ts-ignore TODO(sen) Fix
				plotSettings.opacities[el] = fromLeft
				regenPlot()
			},
			name: "Elements",
			optElementStyle: switchOptionStyleAllCaps,
			horizontalGradient: Object.values(plotSettings.opacities),
			helpText: "Element transparency. Click on the plot to change refline position",
		})
	)
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

		const facetSwitch = addEl(
			dataRelatedInputs,
			createSwitch({
				init: plotSettings.xFacets,
				opts: data.colnames,
				onUpdate: (sel) => {
					plotSettings.xFacets = sel
					data.dataFull = data.dataFull.map((row) => {
						row.__XFACET__ = constructStringFromCols(row, plotSettings.xFacets, FACET_LABEL_SEP)
						return row
					})
					data.dataFiltered = data.dataFiltered.map((row) => {
						row.__XFACET__ = constructStringFromCols(row, plotSettings.xFacets, FACET_LABEL_SEP)
						return row
					})
					regenPlot()
				},
				name: "Facet by",
				singleNullable: true,
			})
		)
		facetSwitch.style.marginBottom = collapsibleSelectorSpacing

		const xAxisSwitch = addEl(
			dataRelatedInputs,
			createSwitch({
				init: plotSettings.xAxis,
				opts: data.colnames,
				onUpdate: (sel) => {
					plotSettings.xAxis = sel
					regenPlot()
				},
				name: "X axis",
			})
		)
		xAxisSwitch.style.marginBottom = collapsibleSelectorSpacing

		addInputSep(dataRelatedInputs, "filters")
		type Filter = {
			selected: any[]
			all: any[]
			optElements: HTMLElement[]
		}
		const filters: Record<string, Filter> = {}

		const updateVisible = (colname: string) => {
			let dataFilteredOther = [...data.dataFull]
			for (const otherColname of data.colnames) {
				if (otherColname !== colname) {
					const allowedVals = filters[otherColname].selected
					dataFilteredOther = dataFilteredOther.filter((row) => allowedVals.includes(row[otherColname]))
				}
			}
			const visible = Arr.unique(dataFilteredOther.map((row) => row[colname]))
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

		for (const colname of data.colnames) {
			const colUniqueVals = Arr.unique(data.dataFull.map((row) => row[colname] as any)).sort(
				getSorter(colname, data.varNames)
			)
			filters[colname] = { selected: colUniqueVals, all: [...colUniqueVals], optElements: [] }
			const el = addEl(
				dataRelatedInputs,
				createSwitch({
					init: colUniqueVals,
					opts: colUniqueVals,
					onUpdate: (sel) => {
						filters[colname].selected = sel
						data.dataFiltered = [...data.dataFull]
						for (const otherColname of data.colnames) {
							const allowedVals = filters[otherColname].selected
							data.dataFiltered = data.dataFiltered.filter((row) =>
								allowedVals.includes(row[otherColname])
							)
							updateVisible(otherColname)
						}
						regenReferenceSwitch()
						regenPlot()
					},
					name: colname,
					optElements: filters[colname].optElements,
				})
			)
			el.style.marginBottom = collapsibleSelectorSpacing
		}

		addInputSep(dataRelatedInputs, "colnames")

		let lastWideFormat = { ...DEFAULT_DATA_VAR_NAMES_WIDE }
		let lastLongFormat = { ...DEFAULT_DATA_VAR_NAMES }
		const varNames = data.varNames
		switch (varNames.format) {
			case "long":
				{
					lastLongFormat = varNames
					lastWideFormat.virus = varNames.virus
				}
				break
			case "wide":
				{
					lastWideFormat = varNames
					lastLongFormat.virus = varNames.virus
				}
				break
		}

		addEl(
			dataRelatedInputs,
			createSwitch({
				init: data.varNames.format,
				opts: <DataFormat[]>DATA_FORMATS,
				onUpdate: () => {
					const varNames = data.varNames
					switch (varNames.format) {
						case "long":
							{
								lastLongFormat = varNames
								lastWideFormat.virus = varNames.virus
								data.varNames = lastWideFormat
							}
							break
						case "wide":
							{
								lastWideFormat = varNames
								lastLongFormat.virus = varNames.virus
								data.varNames = lastLongFormat
							}
							break
					}
					regenPlot()
					regenColnameInputs()
				},
				optElementStyle: switchOptionStyleAllCaps,
				optContainerStyle: (el) => {
					el.style.display = "flex"
					el.style.flexDirection = "row"
					el.style.marginBottom = "10px"
				},
			})
		)

		const colnameInputsContainer = addDiv(dataRelatedInputs)

		const regenColnameInputs = () => {
			removeChildren(colnameInputsContainer)

			for (const varName of Object.keys(data.varNames)) {
				if (varName !== "format" && varName !== "timepointLabels") {
					let helpText: string | undefined = undefined
					if (varName === "uniquePID") {
						helpText =
							"Set of variables that uniquely identifies a subject (pre/post vax titres for different viruses for the same person)"
					}
					const el = addEl(
						colnameInputsContainer,
						createSwitch({
							init: data.varNames[varName as keyof DataVarNames],
							opts: data.colnames,
							onUpdate: (sel) => {
								// @ts-ignore TODO(sen) Fix
								data.varNames[varName as keyof DataVarNames] = sel

								if (varName === "uniquePID") {
									data.dataFull = data.dataFull.map((row) => {
										row.__UNIQUEPID__ = constructStringFromCols(row, data.varNames.uniquePID)
										return row
									})
									data.dataFiltered = data.dataFiltered.map((row) => {
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
						})
					)
					el.style.marginBottom = collapsibleSelectorSpacing
				}
			}

			const timepointLabelInputContainer = addDiv(colnameInputsContainer)
			const regenTimepointLabelInputs = () => {
				const varNames = data.varNames
				removeChildren(timepointLabelInputContainer)
				if (varNames.format === "long") {
					const allTimepoints = Arr.unique(data.dataFiltered.map((row) => row[varNames.timepoint]))
					const preLab = addEl(
						timepointLabelInputContainer,
						createSwitch({
							init: varNames.timepointLabels.pre,
							opts: allTimepoints,
							onUpdate: (sel) => {
								varNames.timepointLabels.pre = sel
								regenPlot()
							},
							name: "pre label",
						})
					)
					preLab.style.marginBottom = collapsibleSelectorSpacing
					addEl(
						timepointLabelInputContainer,
						createSwitch({
							init: varNames.timepointLabels.post,
							opts: allTimepoints,
							onUpdate: (sel) => {
								varNames.timepointLabels.post = sel
								regenPlot()
							},
							name: "post label",
						})
					)
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
		} catch (_error) {
			/* NOTE(sen) Ignore */
		}
		onNewDataString(fetchString)
	}

	fetchAndUpdate("/vis2022sep.csv")

	globalThis.window.addEventListener("keypress", (event: KeyboardEvent) => {
		switch (event.key) {
			case "1":
				fetchAndUpdate("/vis2022.csv")
				break
			case "2":
				fetchAndUpdate("/HI WHO22 full panel.csv")
				break
			case "3":
				fetchAndUpdate("/pivot-wide.csv")
				break
			case "4":
				fetchAndUpdate("/visualiserdata.csv")
				break
			case "5":
				fetchAndUpdate("/2022_SH.titers.txt")
				break
			case "6":
				fetchAndUpdate("/vis2022sep.csv")
				break
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
