export const createWholePageFileInput = (onFileInput: (event: Event) => void) => {

    const fileInputHandler = (event: Event) => {
        fileInputWholePage.style.visibility = "hidden"
        onFileInput(event)
        // NOTE(sen) The change/input event will not be fired for the same file twice otherwise
        fileInputWholePage.value = ""
    }

	const fileInputWholePage = document.createElement("input")
    document.body.appendChild(fileInputWholePage)
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

    return fileInputWholePage
}
