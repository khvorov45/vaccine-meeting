import { VirtualizedList } from "./virtualized-list.js"

const MISSING_STRING = "(missing)"
const TABLE_ROW_HEIGHT_PX = 30
const DOWNLOAD_CSV: { [key: string]: string } = {}

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

const createEl = document.createElement.bind(document)
const createDiv = () => createEl("div")
const addEl = <T1 extends HTMLElement, T2 extends HTMLElement>(parent: T1, child: T2) => {
	parent.appendChild(child)
	return child
}
const addDiv = (parent: HTMLElement) => addEl(parent, createDiv())

const createTableFilterRow = <T>(colSpec: { [key: string]: TableColSpecFinal<T> }, onInput: any) => {
	const filterRow = createDiv()
	applyTableHeaderRowStyle(filterRow)

	let rowWidth = 0
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
				cellContainer.removeChild(helpEl)
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

	let rowWidth = 0
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
				const hidden = createEl("a")
				hidden.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
				hidden.target = "_blank"
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

type TableColSpecFinal<RowType> = {
	access: (row: RowType) => any
	format: (val: any) => string
	width: number
	filter: (row: RowType, val: string) => boolean
	filterVal: string
	filterValProcess: (val: string) => string
}

export type TableColSpec<RowType> = {
	access?: ((row: RowType) => any) | string
	format?: (val: any) => string
	width?: number
	filter?: (row: RowType, val: any) => boolean
	filterValProcess?: (val: string) => string
}

export const createTableFromAos = <RowType extends { [key: string]: any }>({
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
	DOWNLOAD_CSV[title] += colnames.map(x => `"${x}"`).join(",") + "\n"

	// NOTE(sen) Fill in missing spec entries
	const colSpec: { [key: string]: TableColSpecFinal<RowType> } = {}
	for (const colname of colnames) {
		const specInit = colSpecInit[colname]

		let accessInit = specInit.access ?? defaults?.access ?? colname
		if (typeof accessInit === "string" || accessInit instanceof String) {
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

					if ((val.startsWith(">") || val.startsWith("<")) && typeof data === "number") {
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

		const regenBody = () => {
			const newTableBodyHeight = getTableBodyHeight(getTableHeight())
			if (newTableBodyHeight != tableBodyHeight) {
				tableBodyHeight = newTableBodyHeight
				tableBodyContainer.style.maxHeight = newTableBodyHeight + "px"
				virtualizedList.resize(newTableBodyHeight)
			}
		}

		for (let rowIndex = 0; rowIndex < aos.length; rowIndex += 1) {
			const rowData = aos[rowIndex]

			for (let colnameIndex = 0; colnameIndex < colnames.length; colnameIndex++) {
				const colname = colnames[colnameIndex]
				const spec = colSpec[colname]
				const colData = spec.access(rowData)
				const colDataFormatted = spec.format(colData)
				DOWNLOAD_CSV[title] += '"' + colDataFormatted + '"'
				if (colnameIndex < colnames.length - 1) {
					DOWNLOAD_CSV[title] += ","
				}
			}

			DOWNLOAD_CSV[title] += "\n"
			forRow?.(rowData)
		}

        globalThis.window.addEventListener("resize", regenBody)
	}

	return table
}
