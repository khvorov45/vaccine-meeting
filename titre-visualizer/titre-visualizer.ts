import { Papa } from "./papaparse.js"
import * as Arr from "./array.ts"
import * as Rand from "./rand.ts"
import * as Plot from "./plot.ts"
import * as DOM from "./dom.ts"
import * as Table from "./table.ts"
import * as FileInput from "./fileinput.ts"

const PLOT_ELEMENTS_ = ["points", "lines", "boxplots", "counts", "refLine", "means", "bars"] as const
const PLOT_ELEMENTS = PLOT_ELEMENTS_ as unknown as string[]
type PlotElement = typeof PLOT_ELEMENTS_[number]
type Opacities = Record<PlotElement, number>

//
// SECTION Plots
//

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
	theme: "dark" | "light"
	opacities: Opacities
	kind: "titres" | "rises"
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

	const isGood = (n: number | null | undefined) => n !== null && n !== undefined && !isNaN(n)

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
						result = result && isGood(<number>row[varNames.titre])
						break
					case "wide":
						result =
							result && isGood(<number>row[varNames.preTitre]) && isGood(<number>row[varNames.postTitre])
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
				const preStats = Plot.getBoxplotStats(scaledPreTitres)
				const postStats = Plot.getBoxplotStats(scaledPostTitres)

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
				const ratioStats = Plot.getBoxplotStats(scaledRatios)
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
// SECTION Data and main
//

type TimepointLabels = {
	pre: string
	post: string
}

type DataVarNamesLong = {
	format: "long"
	timepoint: string
	titre: string
	timepointLabels: TimepointLabels
}

type DataVarNamesWide = {
	format: "wide"
	preTitre: string
	postTitre: string
}

type DataVarNames = {
	virus: string
	reference: string
	uniquePID: string[] // NOTE(sen) Need for relative titres
} & (DataVarNamesLong | DataVarNamesWide)

type Data = {
	dataFull: Record<string, string | number>[]
	dataFiltered: Record<string, string | number>[]
	varNames: DataVarNames
	colnames: string[]
}

const DEFAULT_DATA_VAR_NAMES_LONG: DataVarNames = {
	format: "long",
	uniquePID: ["pid", "cohort", "vaccine", "serum_source", "testing_lab"],
	timepoint: "timepoint",
	titre: "titre",
	virus: "virus",
	reference: "reference_cell",
	timepointLabels: { pre: "Pre-vax", post: "Post-vax" },
}

const DEFAULT_DATA_VAR_NAMES_WIDE: DataVarNames = {
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
				varNames = { ...DEFAULT_DATA_VAR_NAMES_LONG }
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
		varNames: DEFAULT_DATA_VAR_NAMES_LONG,
	}

	const parseResult = Papa.parse(input, { skipEmptyLines: true, dynamicTyping: true })

	if (parseResult.data.length > 0) {
		data.colnames = parseResult.data[0]
		data.varNames = guessDataVarNames(data.colnames)

		if (parseResult.data.length > 1) {
			let anyTitreIsFractional = false
			let anyTitreIsBelow5 = false

			const isFractional = (val: number) =>
				val !== null && val !== undefined && !isNaN(val) && Math.round(val) !== val

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
								const titre = <number>row[varNames.titre]
								anyTitreIsFractional = anyTitreIsFractional || isFractional(titre)
								anyTitreIsBelow5 = anyTitreIsBelow5 || <number>titre < 5
							}
							break

						case "wide":
							{
								const preTitre = <number>row[varNames.preTitre]
								const postTitre = <number>row[varNames.postTitre]
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
	const inputContainer = DOM.addDiv(mainEl)
	inputContainer.style.display = "flex"
	inputContainer.style.flexDirection = "column"
	inputContainer.style.alignItems = "left"
	inputContainer.style.width = inputBarSize + "px"
	inputContainer.style.marginRight = "10px"
	inputContainer.style.height = "100vh"
	inputContainer.style.overflowY = "scroll"
	inputContainer.style.overflowX = "hidden"
	inputContainer.style.flexShrink = "0"

	const plotContainer = DOM.addDiv(mainEl)
	plotContainer.style.display = "flex"
	plotContainer.style.flexDirection = "column"
	plotContainer.style.alignItems = "top"
	plotContainer.style.height = "calc(100vh - 0px)"
	plotContainer.style.overflowY = "scroll"
	plotContainer.style.overflowX = "hidden"

	const plotParent = DOM.addDiv(plotContainer)
	plotParent.style.flexShrink = "0"
	plotParent.style.overflowX = "scroll"
	plotParent.style.overflowY = "hidden"

	const tableParent = DOM.addDiv(plotContainer)
	tableParent.style.display = "flex"

	const fileInputContainer = DOM.addDiv(inputContainer)
	fileInputContainer.style.border = "1px dashed var(--color-fileSelectBorder)"
	fileInputContainer.style.width = "100%"
	fileInputContainer.style.height = "30px"
	fileInputContainer.style.position = "relative"
	fileInputContainer.style.flexShrink = "0"
	fileInputContainer.style.boxSizing = "border-box"
	fileInputContainer.style.marginBottom = "10px"

	const fileInputLabel = DOM.addDiv(fileInputContainer)
	fileInputLabel.innerHTML = "Select file..."
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
		varNames: DEFAULT_DATA_VAR_NAMES_LONG,
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
		DOM.removeChildren(plotParent)
		const plotBoxplotData: any[] = []
		const plot = createPlot(data, plotSettings, plotBoxplotData)
		DOM.addEl(plotParent, plot.canvas)
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

		DOM.removeChildren(tableParent)
		DOM.addEl(
			tableParent,
			Table.createTableFromAos({
				aos: plotBoxplotData,
				colSpecInit: cols,
				title: plotSettings.kind === "titres" ? "GMT" : "GMR",
				getTableHeightInit: () =>
					Math.max(window.innerHeight - plot.totalHeight - DOM.SCROLLBAR_WIDTHS[0], 300),
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
        const el = <HTMLInputElement>event.target
        const file = el.files?.[0]
        if (file !== null && file !== undefined) {
			fileInputLabel.innerHTML = file.name
			file.text().then((string) => onNewDataString(string))
        }
	}

	const fileInput = <HTMLInputElement>DOM.addEl(fileInputContainer, DOM.createEl("input"))
	fileInput.type = "file"
	fileInput.addEventListener("change", fileInputHandler)
	fileInput.style.opacity = "0"
	fileInput.style.cursor = "pointer"
	fileInput.style.width = "100%"
	fileInput.style.height = "100%"

	FileInput.createWholePageFileInput(fileInputHandler)

	const switchMargin = (container: HTMLElement) => {
		container.style.marginBottom = "10px"
	}

	const switchColors = {
		normal: "var(--color-background)",
		hover: "var(--color-background2)",
		selected: "var(--color-selected)",
	}

	DOM.addEl(
		inputContainer,
		DOM.createSwitch({
			type: "toggleOneNonNullable",
			getValue: () => plotSettings.theme,
			setValue: (opt) => (plotSettings.theme = opt),
			opts: <typeof plotSettings.theme[]>["dark", "light"],
			onUpdate: () => {
				document.documentElement.setAttribute("theme", plotSettings.theme)
				regenPlot()
			},
			name: "Theme",
			switchElementStyle: switchMargin,
			colors: switchColors,
		})
	)

	DOM.addEl(
		inputContainer,
		DOM.createSwitch({
			type: "toggleOneNonNullable",
			getValue: () => plotSettings.kind,
			setValue: (opt) => (plotSettings.kind = opt),
			opts: <typeof plotSettings.kind[]>["titres", "rises"],
			onUpdate: regenPlot,
			name: "Y axis",
			switchElementStyle: switchMargin,
			colors: switchColors,
		})
	)

	DOM.addEl(
		inputContainer,
		DOM.createSwitch({
			type: "toggleOneNonNullable",
			getValue: () => (plotSettings.relative ? "Relative" : "Absolute"),
			setValue: (opt) => (plotSettings.relative = opt === "Relative"),
			opts: ["Absolute", "Relative"],
			onUpdate: () => {
				regenReferenceSwitches()
				regenPlot()
			},
			name: "Titre mode",
			help: "Absolute: actual observations.\nRelative: Titres for each individual are divided by the reference titre for that individual for that subtype",
			switchElementStyle: switchMargin,
			colors: switchColors,
		})
	)

	const collapsibleSelectorSpacing = "10px"

	const referenceSwitchContainer = DOM.addDiv(inputContainer)
	const regenReferenceSwitches = () => {
		DOM.removeChildren(referenceSwitchContainer)
		if (plotSettings.relative) {
			const allViruses = Arr.unique(data.dataFiltered.map((row) => <string>row[data.varNames.virus])).sort(
				virusSort
			)

			DOM.addEl(
				referenceSwitchContainer,
				DOM.createSwitch({
					type: "toggleOneNonNullable",
					getValue: () => plotSettings.refVirus,
					setValue: (opt) => (plotSettings.refVirus = opt),
					opts: allViruses,
					onUpdate: regenPlot,
					name: "Reference",
					colors: switchColors,
					switchElementStyle: switchMargin,
				})
			)

			DOM.addEl(
				referenceSwitchContainer,
				DOM.createSwitch({
					type: "toggleOneNonNullable",
					getValue: () => plotSettings.refType,
					setValue: (opt) => (plotSettings.refType = opt),
					opts: <typeof plotSettings.refType[]>["manual", "data"],
					onUpdate: regenPlot,
					name: "Relative mode",
					colors: switchColors,
					switchElementStyle: switchMargin,
				})
			)
		}
	}

	const opacitiesSwitch = DOM.addEl(
		inputContainer,
		DOM.createSwitch({
			type: "gradient",
			getValue: (opt) => plotSettings.opacities[opt],
			setValue: (opt, _index, value) => (plotSettings.opacities[opt] = value),
			opts: <PlotElement[]>PLOT_ELEMENTS,
			onUpdate: regenPlot,
			name: "Elements",
			help: "Element transparency. Click on the plot to change refline position",
			colors: switchColors,
		})
	)
	opacitiesSwitch.style.marginBottom = collapsibleSelectorSpacing

	const addInputSep = (parent: HTMLElement, label: string) => {
		const sep = DOM.addDiv(parent)
		sep.textContent = label
		sep.style.textAlign = "center"
		sep.style.padding = "10px"
		sep.style.fontWeight = "bold"
		sep.style.textTransform = "uppercase"
		sep.style.letterSpacing = "2px"
		sep.style.borderBottom = "1px solid var(--color-border)"
		sep.style.marginBottom = "10px"
	}

	const dataRelatedInputs = DOM.addDiv(inputContainer)
	const regenDataRelatedInputs = () => {
		DOM.removeChildren(dataRelatedInputs)

		DOM.addEl(
			dataRelatedInputs,
			DOM.createSwitch({
				type: "toggleMany",
				state: plotSettings.xFacets,
				opts: data.colnames,
				onUpdate: () => {
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
				colors: switchColors,
				switchElementStyle: switchMargin,
			})
		)

		const xAxisSwitch = DOM.addEl(
			dataRelatedInputs,
			DOM.createSwitch({
				type: "toggleOneNonNullable",
				getValue: () => plotSettings.xAxis,
				setValue: (opt) => (plotSettings.xAxis = opt),
				opts: data.colnames,
				onUpdate: regenPlot,
				name: "X axis",
				colors: switchColors,
			})
		)
		xAxisSwitch.style.marginBottom = collapsibleSelectorSpacing

		addInputSep(dataRelatedInputs, "filters")
		type Filter = {
			selected: any[]
			all: any[]
			optElements: HTMLDivElement[]
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
			const el = DOM.addEl(
				dataRelatedInputs,
				DOM.createSwitch({
					type: "toggleMany",
					state: filters[colname].selected,
					opts: colUniqueVals,
					onUpdate: () => {
						data.dataFiltered = [...data.dataFull]
						for (const otherColname of data.colnames) {
							const allowedVals = filters[otherColname].selected
							data.dataFiltered = data.dataFiltered.filter((row) =>
								allowedVals.includes(row[otherColname])
							)
							updateVisible(otherColname)
						}
						regenReferenceSwitches()
						regenPlot()
					},
					name: colname,
					optElementStorage: filters[colname].optElements,
					colors: switchColors,
				})
			)
			el.style.marginBottom = collapsibleSelectorSpacing
		}

		addInputSep(dataRelatedInputs, "colnames")

		let lastWideFormat = { ...DEFAULT_DATA_VAR_NAMES_WIDE }
		let lastLongFormat = { ...DEFAULT_DATA_VAR_NAMES_LONG }
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

		DOM.addEl(
			dataRelatedInputs,
			DOM.createSwitch({
				type: "toggleOneNonNullable",
				getValue: () => data.varNames.format,
				setValue: (opt) => (data.varNames.format = opt),
				opts: <typeof data.varNames.format[]>["wide", "long"],
				name: "Format",
				onUpdate: () => {
					const varNames = data.varNames
					switch (varNames.format) {
						case "long":
							lastLongFormat = varNames
							lastWideFormat.virus = varNames.virus
							data.varNames = lastWideFormat
							break
						case "wide":
							lastWideFormat = varNames
							lastLongFormat.virus = varNames.virus
							data.varNames = lastLongFormat
							break
					}
					regenPlot()
					regenColnameInputs()
				},
				switchElementStyle: switchMargin,
				colors: switchColors,
			})
		)

		const colnameInputsContainer = DOM.addDiv(dataRelatedInputs)
		const regenColnameInputs = () => {
			DOM.removeChildren(colnameInputsContainer)

			for (const varName of Object.keys(data.varNames)) {
				switch (varName) {
					case "uniquePID":
						DOM.addEl(
							colnameInputsContainer,
							DOM.createSwitch({
								type: "toggleMany",
								state: data.varNames.uniquePID,
								opts: data.colnames,
								onUpdate: () => {
									data.dataFull = data.dataFull.map((row) => {
										row.__UNIQUEPID__ = constructStringFromCols(row, data.varNames.uniquePID)
										return row
									})
									data.dataFiltered = data.dataFiltered.map((row) => {
										row.__UNIQUEPID__ = constructStringFromCols(row, data.varNames.uniquePID)
										return row
									})
									regenPlot()
								},
								name: varName,
								colors: switchColors,
								help: "Set of variables that uniquely identifies a subject (pre/post vax titres for different viruses for the same person)",
							})
						)
						break

					case "timepoint":
						DOM.addEl(
							colnameInputsContainer,
							DOM.createSwitch({
								type: "toggleOneNonNullable",
								// @ts-ignore TODO(sen) fix
								getValue: () => data.varNames.timepoint,
								// @ts-ignore TODO(sen) fix
								setValue: (opt) => (data.varNames.timepoint = opt),
								opts: data.colnames,
								onUpdate: () => {
									regenTimepointLabelInputs()
									regenPlot()
								},
								name: varName,
								colors: switchColors,
							})
						)
						break

					case "virus":
					case "reference":
					case "preTitre":
					case "postTitre":
					case "titre":
						DOM.addEl(
							colnameInputsContainer,
							DOM.createSwitch({
								type: "toggleOneNonNullable",
								// @ts-ignore TODO(sen) fix
								getValue: () => data.varNames[varName],
								// @ts-ignore TODO(sen) fix
								setValue: () => data.varNames[varName],
								opts: data.colnames,
								onUpdate: () => {
									regenPlot()
								},
								name: varName,
								colors: switchColors,
							})
						)
						break
				}
			}

			const timepointLabelInputContainer = DOM.addDiv(colnameInputsContainer)
			const regenTimepointLabelInputs = () => {
				const varNames = data.varNames
				DOM.removeChildren(timepointLabelInputContainer)
				if (varNames.format === "long") {
					const allTimepoints = Arr.unique(data.dataFiltered.map((row) => row[varNames.timepoint])).map(
						(x) => `${x}`
					)
					const preLab = DOM.addEl(
						timepointLabelInputContainer,
						DOM.createSwitch({
							type: "toggleOneNonNullable",
							getValue: () => varNames.timepointLabels.pre,
							setValue: (opt) => (varNames.timepointLabels.pre = opt),
							opts: allTimepoints,
							onUpdate: regenPlot,
							name: "pre label",
							colors: switchColors,
						})
					)
					preLab.style.marginBottom = collapsibleSelectorSpacing
					DOM.addEl(
						timepointLabelInputContainer,
						DOM.createSwitch({
							type: "toggleOneNonNullable",
							getValue: () => varNames.timepointLabels.post,
							setValue: (opt) => (varNames.timepointLabels.post = opt),
							opts: allTimepoints,
							onUpdate: regenPlot,
							name: "post label",
							colors: switchColors,
						})
					)
				}
			}

			regenTimepointLabelInputs()
		}
		regenColnameInputs()
		regenReferenceSwitches()
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

	if (globalThis.window.location.hostname == "127.0.0.1") {
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
}

main()

// TODO(sen) Better summary table widths
// TODO(sen) Highlight a virus
// TODO(sen) Better titre format detection (and switch)
// TODO(sen) Detect excessive faceting
// TODO(sen) Better colwidth for xfacet and xtick
// TODO(sen) Improve boxplot shading
// TODO(sen) Better colnames guessing (especially the id part)
