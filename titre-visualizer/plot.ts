import * as Color from "./color.ts"

export const CANVAS_FONT_HEIGHT = 16

export type Rect = {
	l: number,
	r: number,
	t: number,
	b: number,
}

export type Plot = {
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

export type PlotSpec = {
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
	theme: "dark" | "light",
}

export type BoxplotStats = {
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

export const drawPoint = (
	renderer: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number,
	color: string, outlineColor: string,
) => {
	const halfr = radius / 2
	drawRect(renderer, {l: centerX - halfr, r: centerX + halfr, t: centerY - halfr, b: centerY + halfr}, color)
}

export const drawLine = (
	renderer: CanvasRenderingContext2D,
	x1: number, y1: number, x2: number, y2: number,
	color1: string, color2: string, thiccness: number, dashSegments: number[]
) => {
	const isGood = (n: any) => n !== null && n !== undefined && !isNaN(n)
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

export const drawDoubleLine = (
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

export const drawPath = (
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

export const drawRect = (renderer: CanvasRenderingContext2D, rect: Rect, color: string) => {
	renderer.fillStyle = color
	renderer.fillRect(rect.l, rect.t, rect.r - rect.l, rect.b - rect.t)
}

export const drawRectOutline = (renderer: CanvasRenderingContext2D, rect: Rect, color: string, thiccness: number) => {
	let halfThicc = thiccness / 2
	drawLine(renderer, rect.l - halfThicc, rect.t, rect.r + halfThicc, rect.t, color, color, thiccness, [])
	drawLine(renderer, rect.r, rect.t, rect.r, rect.b, color, color, thiccness, [])
	drawLine(renderer, rect.l - halfThicc, rect.b, rect.r + halfThicc, rect.b, color, color, thiccness, [])
	drawLine(renderer, rect.l, rect.t, rect.l, rect.b, color, color, thiccness, [])
}

export const drawText = (
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

export const scale = (value: number, valueMin: number, valueMax: number, scaleMin: number, scaleMax: number) => {
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

export const beginPlot = (spec: PlotSpec) => {

	const plotAreaWidth = spec.widthTick * spec.xTicksPerFacet.reduce((acc, cur) => acc += cur.length, 0) +
		spec.padFacet * Math.max(0, spec.xFacetVals.length - 1)
	const facetHeight = spec.heightTick * spec.yTicks.length
	const plotAreaHeight = facetHeight

	const totalWidth = plotAreaWidth + spec.padAxis.l + spec.padData.l + spec.padAxis.r + spec.padData.r
	const totalHeight = plotAreaHeight + spec.padAxis.t + spec.padData.t + spec.padAxis.b + spec.padData.b

	const canvas = document.createElement("canvas")
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
		drawText(renderer, `${xFacetVal ?? "(missing)"}`, facetCenter, yOffset, axisTextCol, 0, "top", "center")
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

export const addBoxplot = (
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

export const addVBar = (
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
