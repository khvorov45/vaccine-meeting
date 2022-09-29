const execCmd = async (cmd: string): Promise<Deno.ProcessStatus> => {
	const args = cmd.split(" ")
	const process = Deno.run({ cmd: args })
	const status = await process.status()
	return status
}

const main = async (): Promise<void> => {
	const bundleStatus = await execCmd("deno bundle titre-visualizer.ts bundle.js")
	if (!bundleStatus.success) return
	if (Deno.args[0] === "release") {
		const htmlMinifyStatus = await execCmd(
			"html-minifier-terser --collapse-whitespace --minify-css true titre-visualizer.html -o index.html"
		)
		if (!htmlMinifyStatus.success) return
		const jsminifyStatus = await execCmd(
			"terser bundle.js -o bundle.min.js --compress toplevel=true --mangle toplevel=true"
		)
		if (!jsminifyStatus.success) return
	}
}

await main()
