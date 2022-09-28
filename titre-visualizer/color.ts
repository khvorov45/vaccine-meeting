export const channel255ToString = (channel: number) => {
	if (channel <= 1) {
		channel *= 255
	}
	return Math.round(channel).toString(16).padStart(2, "0")
}

export const changeSaturation = (col: string, satDelta: number) => {
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

	let redNew = channel255ToString(red)
	let greenNew = channel255ToString(green)
	let blueNew = channel255ToString(blue)

	return "#" + redNew + greenNew + blueNew + alpha
}
