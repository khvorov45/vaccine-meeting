//
// SECTION Array
//
const arrAsc = (arr) => {
    return arr.sort((a, b) => a - b);
};
const arrSum = (arr) => {
    return arr.reduce((a, b) => a + b, 0);
};
const arrCumSum = (arr) => {
    let result = [];
    let current = 0;
    for (let val of arr) {
        current += val;
        result.push(current);
    }
    return result;
};
const arrMean = (arr) => {
    return arrSum(arr) / arr.length;
};
const arrSd = (arr) => {
    const mu = arrMean(arr);
    const diffArr = arr.map((a) => (a - mu) ** 2);
    return Math.sqrt(arrSum(diffArr) / (arr.length - 1));
};
const arrSortedAscQuantile = (sorted, q) => {
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    let result = sorted[base];
    if (sorted[base + 1] !== undefined) {
        result += rest * (sorted[base + 1] - sorted[base]);
    }
    return result;
};
const arrQuantile = (arr, q) => {
    return arrSortedAscQuantile(arrAsc(arr), q);
};
const arrSortedAscMin = (sorted) => {
    return sorted[0];
};
const arrSortedAscMax = (sorted) => {
    return sorted[sorted.length - 1];
};
const arrUnique = (arr) => Array.from(new Set(arr));
//
// SECTION DOM
//
const XMLNS = "http://www.w3.org/2000/svg";
const createEl = (name) => document.createElement(name);
const createDiv = () => createEl("div");
const addEl = (parent, child) => { parent.appendChild(child); return child; };
const addDiv = (parent) => addEl(parent, createDiv());
const removeChildren = (el) => { while (el.lastChild) {
    el.removeChild(el.lastChild);
} };
//
// SECTION ?
//
const groupByOne = (rows, key) => {
    let result = {};
    for (let row of rows) {
        if (result[row[key]] === undefined) {
            result[row[key]] = [];
        }
        result[row[key]].push(row);
    }
    return result;
};
const groupByMultiple = (rows, keys) => {
    let result = {};
    for (let row of rows) {
        let current = result;
        for (let [keyIndex, key] of keys.entries()) {
            if (current[row[key]] === undefined) {
                if (keyIndex === keys.length - 1) {
                    current[row[key]] = [];
                }
                else {
                    current[row[key]] = {};
                }
            }
            if (keyIndex === keys.length - 1) {
                current[row[key]].push(row);
            }
            current = current[row[key]];
        }
    }
    return result;
};
const summariseGrouped = (data, groupVars, func) => {
    const calcRow = (data, currentRow) => {
        let result = [];
        if (Array.isArray(data)) {
            if (data.length > 0) {
                let summarized = func(data);
                result = [Object.assign(Object.assign({}, currentRow), summarized)];
            }
        }
        else {
            let currentVarname = groupVars[Object.keys(currentRow).length];
            for (let key of Object.keys(data)) {
                currentRow[currentVarname] = key;
                let row = calcRow(data[key], Object.assign({}, currentRow));
                if (row.length > 0) {
                    result = result.concat(row);
                }
            }
        }
        return result;
    };
    return calcRow(data, {});
};
const stringSort = (s1, s2) => (s1 > s2 ? 1 : s1 < s2 ? -1 : 0);
const desiredOrderSort = (ord) => {
    return (a, b) => {
        let result = 0;
        let ai = ord.indexOf(a);
        let bi = ord.indexOf(b);
        if (ai !== -1 || bi !== -1) {
            if (ai === -1) {
                result = 1;
            }
            else if (bi === -1) {
                result = -1;
            }
            else if (ai > bi) {
                result = 1;
            }
            else if (ai < bi) {
                result = -1;
            }
        }
        return result;
    };
};
const scale = (value, valueMin, valueMax, scaleMin, scaleMax) => {
    let result = scaleMin;
    let scaleRange = scaleMax - scaleMin;
    if (scaleRange !== 0) {
        result = scaleRange / 2 + scaleMin;
        let valueRange = valueMax - valueMin;
        if (valueRange !== 0) {
            let value0 = value - valueMin;
            let valueNorm = value0 / valueRange;
            let valueScale0 = valueNorm * scaleRange;
            result = valueScale0 + scaleMin;
        }
    }
    return result;
};
const parseData = (input) => {
    let result = [];
    if (input.length > 0) {
        let lines = input.split(/\r?\n/).filter((line) => line !== "");
        let linesSplit = lines.map((line) => line.split(","));
        let names = linesSplit[0];
        if (linesSplit.length > 1) {
            for (let values of linesSplit.slice(1)) {
                let row = {};
                for (let [index, name] of names.entries()) {
                    let value = values[index];
                    if (name === "titre" || name === "clade_freq") {
                        value = parseFloat(value);
                    }
                    else if (name === "vaccine_strain") {
                        value = value === "TRUE";
                    }
                    else if (name === "cohort") {
                        value = value.toLowerCase();
                    }
                    row[name] = value;
                }
                result.push(row);
            }
        }
    }
    return result;
};
const reduceAxisPadBottom = (newValue, oldSizes) => {
    let sizes = Object.assign({}, oldSizes);
    sizes.plotHeight -= sizes.axisPadBottom - newValue;
    sizes.axisPadBottom = newValue;
    return sizes;
};
const colChannel255ToString = (channel) => {
    return channel.toString(16).padStart(2, "0");
};
const colChangeSaturation = (col, satDelta) => {
    let alpha = col.slice(7, 9);
    let red = parseInt(col.slice(1, 3), 16);
    let green = parseInt(col.slice(3, 5), 16);
    let blue = parseInt(col.slice(5, 7), 16);
    let mean = (red + green + blue) / 3;
    red = (red - mean) * satDelta + mean;
    green = (green - mean) * satDelta + mean;
    blue = (blue - mean) * satDelta + mean;
    red = Math.max(Math.min(Math.round(red), 255), 0);
    green = Math.max(Math.min(Math.round(green), 255), 0);
    blue = Math.max(Math.min(Math.round(blue), 255), 0);
    let redNew = colChannel255ToString(red);
    let greenNew = colChannel255ToString(green);
    let blueNew = colChannel255ToString(blue);
    return "#" + redNew + greenNew + blueNew + alpha;
};
const createTitreAxisElement = (colors, plotWidth, sizes, scaleTitre, title, rise) => {
    let titreAxis = document.createElementNS(XMLNS, "g");
    // NOTE(sen) Title
    let yTitle = document.createElementNS(XMLNS, "text");
    yTitle.setAttributeNS(null, "x", "0");
    yTitle.setAttributeNS(null, "y", "0");
    yTitle.setAttributeNS(null, "fill", colors.text);
    yTitle.setAttributeNS(null, "transform", `translate(${0}, ${(sizes.plotHeight - sizes.axisPadBottom) / 2}) rotate(-90)`);
    yTitle.setAttributeNS(null, "dominant-baseline", "hanging");
    yTitle.setAttributeNS(null, "text-anchor", "middle");
    yTitle.innerHTML = title;
    titreAxis.appendChild(yTitle);
    // NOTE(sen) Line
    let yLine = document.createElementNS(XMLNS, "line");
    yLine.setAttributeNS(null, "x1", sizes.axisPadLeft);
    yLine.setAttributeNS(null, "x2", sizes.axisPadLeft);
    yLine.setAttributeNS(null, "y1", `${sizes.plotHeight - sizes.axisPadBottom}`);
    yLine.setAttributeNS(null, "y2", sizes.axisPadTop);
    yLine.setAttributeNS(null, "stroke", colors.axis);
    titreAxis.appendChild(yLine);
    let yLine2 = document.createElementNS(XMLNS, "line");
    yLine2.setAttributeNS(null, "x1", plotWidth);
    yLine2.setAttributeNS(null, "x2", plotWidth);
    yLine2.setAttributeNS(null, "y1", `${sizes.plotHeight - sizes.axisPadBottom}`);
    yLine2.setAttributeNS(null, "y2", sizes.axisPadTop);
    yLine2.setAttributeNS(null, "stroke", colors.axis);
    titreAxis.appendChild(yLine2);
    // NOTE(sen) Ticks and numbers
    let yTicks = [5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120, 10240];
    if (rise) {
        yTicks = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
    }
    for (let yTick of yTicks) {
        let yCoord = scaleTitre(yTick);
        let tick = document.createElementNS(XMLNS, "line");
        tick.setAttributeNS(null, "x1", `${sizes.axisPadLeft - sizes.tickLength - 1}`);
        tick.setAttributeNS(null, "x2", `${sizes.axisPadLeft - 1}`);
        tick.setAttributeNS(null, "y1", yCoord);
        tick.setAttributeNS(null, "y2", yCoord);
        tick.setAttributeNS(null, "stroke", colors.axis);
        titreAxis.appendChild(tick);
        let gridline = document.createElementNS(XMLNS, "line");
        gridline.setAttributeNS(null, "x1", sizes.axisPadLeft + 1);
        gridline.setAttributeNS(null, "x2", plotWidth);
        gridline.setAttributeNS(null, "y1", yCoord);
        gridline.setAttributeNS(null, "y2", yCoord);
        gridline.setAttributeNS(null, "stroke", colors.grid);
        titreAxis.appendChild(gridline);
        let number = document.createElementNS(XMLNS, "text");
        number.setAttributeNS(null, "x", `${sizes.axisPadLeft - sizes.tickLength * 1.5}`);
        number.setAttributeNS(null, "y", yCoord);
        number.setAttributeNS(null, "fill", colors.text);
        number.setAttributeNS(null, "dominant-baseline", "middle");
        number.setAttributeNS(null, "text-anchor", "end");
        number.innerHTML = yTick.toFixed();
        titreAxis.appendChild(number);
    }
    return titreAxis;
};
const createXAxisBottomLine = (plotWidth, sizes, colors) => {
    let xLine = document.createElementNS(XMLNS, "line");
    xLine.setAttributeNS(null, "x1", sizes.axisPadLeft);
    xLine.setAttributeNS(null, "x2", plotWidth);
    xLine.setAttributeNS(null, "y1", `${sizes.plotHeight - sizes.axisPadBottom}`);
    xLine.setAttributeNS(null, "y2", `${sizes.plotHeight - sizes.axisPadBottom}`);
    xLine.setAttributeNS(null, "stroke", colors.axis);
    return xLine;
};
const createXAxisTopLine = (plotWidth, sizes, colors) => {
    let xLine2 = document.createElementNS(XMLNS, "line");
    xLine2.setAttributeNS(null, "x1", sizes.axisPadLeft);
    xLine2.setAttributeNS(null, "x2", plotWidth);
    xLine2.setAttributeNS(null, "y1", sizes.axisPadTop);
    xLine2.setAttributeNS(null, "y2", sizes.axisPadTop);
    xLine2.setAttributeNS(null, "stroke", colors.axis);
    return xLine2;
};
const createXTick = (xCoord, sizes, colors) => {
    let tick = document.createElementNS(XMLNS, "line");
    tick.setAttributeNS(null, "x1", xCoord);
    tick.setAttributeNS(null, "x2", xCoord);
    tick.setAttributeNS(null, "y1", `${sizes.plotHeight - sizes.axisPadBottom + 1}`);
    tick.setAttributeNS(null, "y2", sizes.plotHeight - sizes.axisPadBottom + 1 + sizes.tickLength);
    tick.setAttributeNS(null, "stroke", colors.axis);
    return tick;
};
const createXLabel = (label, angle, textAnchor, xCoord, sizes, colors) => {
    let yCoord = sizes.plotHeight - sizes.axisPadBottom + sizes.tickLength * 2;
    let element = document.createElementNS(XMLNS, "text");
    element.setAttributeNS(null, "x", "0");
    element.setAttributeNS(null, "y", "0");
    element.setAttributeNS(null, "fill", colors.text);
    element.setAttributeNS(null, "dominant-baseline", "hanging");
    element.setAttributeNS(null, "text-anchor", textAnchor);
    element.setAttributeNS(null, "text-wrap", "wrap");
    element.setAttributeNS(null, "transform", `translate(${xCoord}, ${yCoord}) rotate(${angle})`);
    element.innerHTML = label;
    return element;
};
const createDashedHLine = (yCoord, plotWidth, sizes, color) => {
    let el = document.createElementNS(XMLNS, "line");
    el.setAttributeNS(null, "x1", sizes.axisPadLeft);
    el.setAttributeNS(null, "x2", plotWidth);
    el.setAttributeNS(null, "y1", yCoord);
    el.setAttributeNS(null, "y2", yCoord);
    el.setAttributeNS(null, "stroke", color);
    el.setAttributeNS(null, "stroke-dasharray", "5,5");
    return el;
};
const createVLine = (xCoord, col, sizes) => {
    let el = document.createElementNS(XMLNS, "line");
    el.setAttributeNS(null, "x1", xCoord);
    el.setAttributeNS(null, "x2", xCoord);
    el.setAttributeNS(null, "y1", sizes.axisPadTop);
    el.setAttributeNS(null, "y2", `${sizes.plotHeight - sizes.axisPadBottom}`);
    el.setAttributeNS(null, "stroke", col);
    return el;
};
const createPoint = (xCoord, yCoord, col) => {
    let point = document.createElementNS(XMLNS, "circle");
    point.setAttributeNS(null, "cx", xCoord);
    point.setAttributeNS(null, "cy", yCoord);
    point.setAttributeNS(null, "r", "2");
    point.setAttributeNS(null, "fill", col);
    return point;
};
const createFacetLabel = (xCoord, col, label, sizes) => {
    let el = document.createElementNS(XMLNS, "text");
    el.setAttributeNS(null, "x", xCoord);
    el.setAttributeNS(null, "y", `${sizes.axisPadTop - sizes.tickLength}`);
    el.setAttributeNS(null, "fill", col);
    el.setAttributeNS(null, "text-anchor", "middle");
    el.innerHTML = label;
    return el;
};
const createLine = (x1, x2, y1, y2, col) => {
    let line = document.createElementNS(XMLNS, "line");
    line.setAttributeNS(null, "x1", x1);
    line.setAttributeNS(null, "x2", x2);
    line.setAttributeNS(null, "y1", y1);
    line.setAttributeNS(null, "y2", y2);
    line.setAttributeNS(null, "stroke", col);
    return line;
};
const createCount = (count, xCoord, yCoord, col) => {
    let el = document.createElementNS(XMLNS, "text");
    el.innerHTML = count;
    el.setAttributeNS(null, "x", xCoord);
    el.setAttributeNS(null, "y", yCoord);
    el.setAttributeNS(null, "fill", col);
    el.setAttributeNS(null, "text-anchor", "middle");
    el.setAttributeNS(null, "dominant-baseline", "hanging");
    return el;
};
const calcBoxplotStats = (arr) => {
    let stats = null;
    if (arr.length > 0) {
        let arrSortedAsc = arrAsc(arr);
        stats = {};
        stats.median = arrSortedAscQuantile(arrSortedAsc, 0.5);
        stats.q25 = arrSortedAscQuantile(arrSortedAsc, 0.25);
        stats.q75 = arrSortedAscQuantile(arrSortedAsc, 0.75);
        stats.max = arrSortedAscMax(arrSortedAsc);
        stats.min = arrSortedAscMin(arrSortedAsc);
        stats.iqr = stats.q75 - stats.q25;
        stats.iqr15 = 1.5 * stats.iqr;
        let epsilon = 0.00001;
        stats.top = arrSortedAscMax(arrSortedAsc.filter((val) => val <= stats.q75 + stats.iqr15 + epsilon &&
            val <= stats.q75 + stats.iqr15 - epsilon));
        stats.bottom = arrSortedAscMin(arrSortedAsc.filter((val) => val >= stats.q25 - stats.iqr15 + epsilon &&
            val >= stats.q25 - stats.iqr15 - epsilon));
    }
    return stats;
};
const calcMeanStats = (arr) => {
    let stats = null;
    if (arr.length > 0) {
        stats = {};
        stats.mean = arrMean(arr);
        stats.sd = arrSd(arr);
        stats.se = stats.sd / Math.sqrt(arr.length);
        let errorMargin = 1.96 * stats.se;
        stats.low = stats.mean - errorMargin;
        stats.high = stats.mean + errorMargin;
    }
    return stats;
};
const createErrorBar = (low, mid, high, xCoord, col) => {
    let el = document.createElementNS(XMLNS, "g");
    el.setAttributeNS(null, "fill", col);
    el.setAttributeNS(null, "stroke", col);
    let point = document.createElementNS(XMLNS, "circle");
    point.setAttributeNS(null, "cx", xCoord);
    point.setAttributeNS(null, "cy", mid);
    point.setAttributeNS(null, "r", "5");
    let line = document.createElementNS(XMLNS, "line");
    line.setAttributeNS(null, "y1", low);
    line.setAttributeNS(null, "y2", high);
    line.setAttributeNS(null, "x1", xCoord);
    line.setAttributeNS(null, "x2", xCoord);
    line.setAttributeNS(null, "stroke-width", "3");
    el.appendChild(point);
    el.appendChild(line);
    return el;
};
const isGood = (n) => n !== null && n !== undefined && !isNaN(n);
const createBoxplotElement = (whiskerDown, boxDown, boxMid, boxUp, whiskerUp, boxWidth, xCoord, col) => {
    let boxplot = document.createElementNS(XMLNS, "g");
    boxplot.setAttributeNS(null, "stroke", col);
    const drawBoxplotHline = (yCoord, thickness, addWidth) => {
        let line = document.createElementNS(XMLNS, "line");
        if (!addWidth) {
            addWidth = 0;
        }
        if (isGood(xCoord) && isGood(yCoord) && isGood(boxWidth)) {
            line.setAttributeNS(null, "x1", `${xCoord - (addWidth + boxWidth / 2)}`);
            line.setAttributeNS(null, "x2", xCoord + (addWidth + boxWidth / 2));
            line.setAttributeNS(null, "y1", yCoord);
            line.setAttributeNS(null, "y2", yCoord);
            line.setAttributeNS(null, "stroke-width", thickness);
        }
        boxplot.appendChild(line);
    };
    drawBoxplotHline(boxMid, 4, 10);
    drawBoxplotHline(boxUp, 1);
    drawBoxplotHline(boxDown, 1);
    const drawBoxplotVline = (xCoord) => {
        let line = document.createElementNS(XMLNS, "line");
        if (isGood(xCoord) && isGood(boxUp) && isGood(boxDown)) {
            line.setAttributeNS(null, "x1", xCoord);
            line.setAttributeNS(null, "x2", xCoord);
            line.setAttributeNS(null, "y1", boxUp);
            line.setAttributeNS(null, "y2", boxDown);
        }
        boxplot.appendChild(line);
    };
    drawBoxplotVline(xCoord - boxWidth / 2);
    drawBoxplotVline(xCoord + boxWidth / 2);
    const drawBoxplotWhisker = (start, end) => {
        let line = document.createElementNS(XMLNS, "line");
        if (isGood(xCoord) && isGood(start) && isGood(end)) {
            line.setAttributeNS(null, "x1", xCoord);
            line.setAttributeNS(null, "x2", xCoord);
            line.setAttributeNS(null, "y1", start);
            line.setAttributeNS(null, "y2", end);
        }
        boxplot.appendChild(line);
    };
    drawBoxplotWhisker(boxUp, whiskerUp);
    drawBoxplotWhisker(boxDown, whiskerDown);
    return boxplot;
};
const createSvgElement = () => {
    let plotSvg = document.createElementNS(XMLNS, "svg");
    plotSvg.style.flexShrink = "0";
    plotSvg.style.display = "block";
    return plotSvg;
};
const setPlotSvgSize = (svg, width, height) => {
    svg.setAttributeNS(null, "viewBox", "0 0 " + width + " " + height);
    svg.setAttributeNS(null, "width", width);
    svg.setAttributeNS(null, "height", height);
};
const calcPlotWidth = (sizes, entryCount) => {
    let result = sizes.dataPadX + sizes.axisPadLeft + sizes.widthPerElement * entryCount;
    return result;
};
const createScaleLogtitre = (sizes, rise) => {
    let min = 5;
    let max = 10240;
    if (rise) {
        min = 1;
        max = 550;
    }
    return (val) => scale(val, Math.log(min), Math.log(max), sizes.plotHeight - sizes.dataPadY - sizes.axisPadBottom, sizes.dataPadY + sizes.axisPadTop);
};
const createScaleFacetedCategorical = (facetEntryCounts, sizes) => {
    let facetEntryCumCounts = arrCumSum(facetEntryCounts);
    let totalCount = facetEntryCumCounts[facetEntryCumCounts.length - 1];
    let plotWidth = calcPlotWidth(sizes, totalCount);
    return (facetIndex, entryIndex) => {
        let facetEntryCount = facetEntryCounts[facetIndex];
        let facetEntryCumCount = facetEntryCumCounts[facetIndex];
        let entryCountOffset = facetEntryCumCount - facetEntryCount;
        let realIndex = entryIndex + entryCountOffset;
        let result = scale(realIndex, 0, totalCount - 1, sizes.axisPadLeft + sizes.dataPadX, plotWidth - sizes.dataPadX);
        return result;
    };
};
const createScaleCategorical = (count, sizes) => {
    let plotWidth = calcPlotWidth(sizes, count);
    return (index) => scale(index, 0, count - 1, sizes.axisPadLeft + sizes.dataPadX, plotWidth - sizes.dataPadX);
};
const createTitrePlotSvg = (data, cladeFreqs, vaccineStrains, opacities, colors, sizes, cladeFreqElements) => {
    let plotSvg = createSvgElement();
    if (data !== null && data !== undefined && data.length > 0) {
        //
        // SECTION Scales
        //
        // NOTE(sen) Y-Axis
        let scaleLogtitre = createScaleLogtitre(sizes);
        let scaleTitre = (val) => scaleLogtitre(Math.log(val));
        // NOTE(sen) X-Axis
        let virusClades = {};
        for (let row of data) {
            if (virusClades[row.virus] === undefined) {
                virusClades[row.virus] = row.clade;
            }
        }
        let labs = arrUnique(data.map((row) => row.testing_lab)).sort(stringSort);
        let labViruses = [];
        let labVirusCounts = [];
        for (let lab of labs) {
            let labData = data.filter((row) => row.testing_lab == lab);
            let viruses = arrUnique(labData.map((row) => row.virus)).sort((v1, v2) => {
                let result = 0;
                let yearPat = /(\d{4})e?$/;
                let year1 = yearPat.exec(v1)[1];
                let year2 = yearPat.exec(v2)[1];
                if (year1 !== undefined && year2 !== undefined) {
                    result = parseInt(year1) - parseInt(year2);
                }
                if (result === 0) {
                    let clade1 = virusClades[v1];
                    let clade2 = virusClades[v2];
                    if (clade1 > clade2) {
                        result = 1;
                    }
                    else {
                        result = -1;
                    }
                }
                if (result === 0) {
                    if (v1 > v2) {
                        result = 1;
                    }
                    else {
                        result = -1;
                    }
                }
                return result;
            });
            labViruses.push(viruses);
            labVirusCounts.push(viruses.length);
        }
        let plotWidth = calcPlotWidth(sizes, arrSum(labVirusCounts));
        const scaleLabIndexVirusIndex = createScaleFacetedCategorical(labVirusCounts, sizes);
        setPlotSvgSize(plotSvg, plotWidth, sizes.plotHeight);
        //
        // SECTION Y-Axis
        //
        let yAxis = createTitreAxisElement(colors, plotWidth, sizes, scaleTitre, "Titre");
        plotSvg.appendChild(yAxis);
        //
        // SECTION X-axis
        //
        // NOTE(sen) Line
        plotSvg.appendChild(createXAxisBottomLine(plotWidth, sizes, colors));
        plotSvg.appendChild(createXAxisTopLine(plotWidth, sizes, colors));
        // NOTE(sen) Ticks and labels
        for (let [labIndex, virusNames] of labViruses.entries()) {
            for (let [virusIndex, virusName] of virusNames.entries()) {
                let xCoord = scaleLabIndexVirusIndex(labIndex, virusIndex);
                plotSvg.appendChild(createXTick(xCoord, sizes, colors));
                plotSvg.appendChild(createXLabel(virusName, -45, "end", xCoord, sizes, colors));
                let cladeName = virusClades[virusName];
                let cladeFreq = Math.round(cladeFreqs[cladeName] * 100);
                let cladeLabel = createXLabel(cladeName + " (" + cladeFreq + "%)", -45, "end", xCoord + sizes.svgTextLineHeightGuess, sizes, colors);
                plotSvg.appendChild(cladeLabel);
                cladeFreqElements[cladeName].push(cladeLabel);
            }
        }
        //
        // SECTION Main plot
        //
        // NOTE(sen) Line at 40
        let line40 = createDashedHLine(scaleTitre(40), plotWidth, sizes, colors.thresholdLine);
        plotSvg.appendChild(line40);
        opacities.line40.titrePlotElements.push(line40);
        // NOTE(sen) The rest of the plot
        for (let [labIndex, virusNames] of labViruses.entries()) {
            let labData = data.filter((row) => row.testing_lab == labs[labIndex]);
            let serumIds = arrUnique(labData.map((row) => row.serum_id));
            // NOTE(sen) Lab marker line
            let labFirstX = scaleLabIndexVirusIndex(labIndex, 0);
            let labLastX = scaleLabIndexVirusIndex(labIndex, labVirusCounts[labIndex] - 1);
            if (labIndex < labViruses.length - 1) {
                let markerLineX = labLastX + sizes.widthPerElement / 2;
                let markerLine = createVLine(markerLineX, colors.axis, sizes);
                plotSvg.appendChild(markerLine);
            }
            // NOTE(sen) Lab marker text
            let markerTextX = (labLastX + labFirstX) / 2;
            let markerText = createFacetLabel(markerTextX, colors.text, labs[labIndex], sizes);
            plotSvg.appendChild(markerText);
            for (let [virusIndex, virusName] of virusNames.entries()) {
                let virusData = labData.filter((row) => row.virus == virusName);
                let virusDataPrevax = virusData.filter((row) => row.timepoint === "Pre-vax");
                let virusDataPostvax = virusData.filter((row) => row.timepoint === "Post-vax");
                let preVaxPoints = 0;
                let postVaxPoints = 0;
                let thisPreVaxCol = colors.preVax;
                let thisPostVaxCol = colors.postVax;
                if (vaccineStrains.includes(virusName)) {
                    thisPreVaxCol = colors.vaccinePreVax;
                    thisPostVaxCol = colors.vaccinePostVax;
                }
                for (let serumId of serumIds) {
                    let preVaxData = virusDataPrevax.filter((row) => row.serum_id == serumId);
                    let postVaxData = virusDataPostvax.filter((row) => row.serum_id == serumId);
                    const drawPoint = (titre, timepoint) => {
                        let coords = null;
                        if (titre) {
                            let yCoord = scaleLogtitre(Math.log(titre) + Math.random() * 0.1);
                            let xCoord = scaleLabIndexVirusIndex(labIndex, virusIndex + (Math.random() - 0.5) * 0.05) -
                                sizes.prePostDistance / 2;
                            let col = thisPreVaxCol;
                            if (timepoint === "Post-vax") {
                                xCoord += sizes.prePostDistance;
                                col = thisPostVaxCol;
                                postVaxPoints += 1;
                            }
                            else {
                                preVaxPoints += 1;
                            }
                            let point = createPoint(xCoord, yCoord, col + colChannel255ToString(opacities.points.value));
                            plotSvg.appendChild(point);
                            opacities.points.titrePlotElements.push(point);
                            coords = { x: xCoord, y: yCoord };
                        }
                        return coords;
                    };
                    let p1 = null;
                    if (preVaxData.length == 1) {
                        p1 = drawPoint(preVaxData[0].titre, "Pre-vax");
                    }
                    let p2 = null;
                    if (postVaxData.length == 1) {
                        p2 = drawPoint(postVaxData[0].titre, "Post-vax");
                    }
                    // NOTE(sen) Line
                    if (p1 != null && p2 != null) {
                        let line = createLine(p1.x, p2.x, p1.y, p2.y, thisPreVaxCol + colChannel255ToString(opacities.lines.value));
                        plotSvg.appendChild(line);
                        opacities.lines.titrePlotElements.push(line);
                    }
                }
                // NOTE(sen) Point counts and boxplots
                for (let timepoint of ["Pre-vax", "Post-vax"]) {
                    // NOTE(sen) Counts
                    let col = thisPreVaxCol;
                    let xCoord = scaleLabIndexVirusIndex(labIndex, virusIndex) -
                        sizes.prePostDistance / 2;
                    let countValue = preVaxPoints;
                    let titres = virusDataPrevax;
                    if (timepoint == "Post-vax") {
                        xCoord += sizes.prePostDistance;
                        col = thisPostVaxCol;
                        countValue = postVaxPoints;
                        titres = virusDataPostvax;
                    }
                    let yCoord = sizes.axisPadTop + 2;
                    let count = createCount(countValue, xCoord, yCoord, col + colChannel255ToString(opacities.counts.value));
                    plotSvg.appendChild(count);
                    opacities.counts.titrePlotElements.push(count);
                    // NOTE(sen) Boxplots
                    titres = titres
                        .filter((row) => isGood(row.titre))
                        .map((row) => Math.log(row.titre));
                    let boxplotStats = calcBoxplotStats(titres);
                    if (boxplotStats !== null) {
                        let boxplot = createBoxplotElement(scaleLogtitre(boxplotStats.bottom), scaleLogtitre(boxplotStats.q25), scaleLogtitre(boxplotStats.median), scaleLogtitre(boxplotStats.q75), scaleLogtitre(boxplotStats.top), sizes.boxPlotWidth, xCoord, col + colChannel255ToString(opacities.boxplots.value));
                        plotSvg.appendChild(boxplot);
                        opacities.boxplots.titrePlotElements.push(boxplot);
                    }
                    // NOTE(sen) GMTs
                    let gmtStats = calcMeanStats(titres);
                    if (virusName === "A/Victoria/2570/2019e" && timepoint === "Post-vax") {
                        const yCoord = scaleLogtitre(gmtStats.mean);
                        const line = createLine(labFirstX - sizes.widthPerElement / 2, labLastX + sizes.widthPerElement / 2, yCoord, yCoord, colors.vaccinePostVax);
                        addEl(plotSvg, line);
                    }
                    if (gmtStats !== null) {
                        let gmtErrorBar = createErrorBar(scaleLogtitre(gmtStats.low), scaleLogtitre(gmtStats.mean), scaleLogtitre(gmtStats.high), xCoord, colChangeSaturation(col + colChannel255ToString(opacities.means.value), 2));
                        plotSvg.appendChild(gmtErrorBar);
                        opacities.means.titrePlotElements.push(gmtErrorBar);
                    }
                } // NOTE(sen) for (timepoint)
            } // NOTE(sen) for (virus)
        } // NOTE(sen) for (lab)
    }
    return plotSvg;
};
const createRisePlotSvg = (data, cladeFreqs, vaccineStrains, opacities, colors, sizes, cladeFreqElements) => {
    let plotSvg = createSvgElement();
    if (data !== null && data !== undefined && data.length > 0) {
        //
        // SECTION Scales
        //
        // NOTE(sen) Y-Axis
        let scaleLogrise = createScaleLogtitre(sizes, true);
        let scaleRise = (val) => scaleLogrise(Math.log(val));
        // NOTE(sen) X-Axis
        let virusClades = {};
        for (let row of data) {
            if (virusClades[row.virus] === undefined) {
                virusClades[row.virus] = row.clade;
            }
        }
        let labs = arrUnique(data.map((row) => row.testing_lab)).sort(stringSort);
        let labViruses = [];
        let labVirusCounts = [];
        for (let lab of labs) {
            let labData = data.filter((row) => row.testing_lab == lab);
            let viruses = arrUnique(labData.map((row) => row.virus)).sort((v1, v2) => {
                let result = 0;
                let yearPat = /(\d{4})e?$/;
                let year1 = yearPat.exec(v1)[1];
                let year2 = yearPat.exec(v2)[1];
                if (year1 !== undefined && year2 !== undefined) {
                    result = parseInt(year1) - parseInt(year2);
                }
                if (result === 0) {
                    let clade1 = virusClades[v1];
                    let clade2 = virusClades[v2];
                    if (clade1 > clade2) {
                        result = 1;
                    }
                    else {
                        result = -1;
                    }
                }
                if (result === 0) {
                    if (v1 > v2) {
                        result = 1;
                    }
                    else {
                        result = -1;
                    }
                }
                return result;
            });
            labViruses.push(viruses);
            labVirusCounts.push(viruses.length);
        }
        let plotWidth = calcPlotWidth(sizes, arrSum(labVirusCounts));
        const scaleLabIndexVirusIndex = createScaleFacetedCategorical(labVirusCounts, sizes);
        setPlotSvgSize(plotSvg, plotWidth, sizes.plotHeight);
        //
        // SECTION Y-Axis
        //
        let yAxis = createTitreAxisElement(colors, plotWidth, sizes, scaleRise, "Fold-rise", true);
        plotSvg.appendChild(yAxis);
        //
        // SECTION X-axis
        //
        // NOTE(sen) Line
        plotSvg.appendChild(createXAxisBottomLine(plotWidth, sizes, colors));
        plotSvg.appendChild(createXAxisTopLine(plotWidth, sizes, colors));
        // NOTE(sen) Ticks and labels
        for (let [labIndex, virusNames] of labViruses.entries()) {
            for (let [virusIndex, virusName] of virusNames.entries()) {
                let xCoord = scaleLabIndexVirusIndex(labIndex, virusIndex);
                plotSvg.appendChild(createXTick(xCoord, sizes, colors));
                plotSvg.appendChild(createXLabel(virusName, -45, "end", xCoord, sizes, colors));
                let cladeName = virusClades[virusName];
                let cladeFreq = Math.round(cladeFreqs[cladeName] * 100);
                let cladeLabel = createXLabel(cladeName + " (" + cladeFreq + "%)", -45, "end", xCoord + sizes.svgTextLineHeightGuess, sizes, colors);
                plotSvg.appendChild(cladeLabel);
                cladeFreqElements[cladeName].push(cladeLabel);
            }
        }
        //
        // SECTION Main plot
        //
        // NOTE(sen) Line at 4
        let line4 = createDashedHLine(scaleRise(4), plotWidth, sizes, colors.thresholdLine);
        plotSvg.appendChild(line4);
        opacities.line40.titrePlotElements.push(line4);
        // NOTE(sen) The rest of the plot
        for (let [labIndex, virusNames] of labViruses.entries()) {
            let labData = data.filter((row) => row.testing_lab == labs[labIndex]);
            let serumIds = arrUnique(labData.map((row) => row.serum_id));
            // NOTE(sen) Lab marker line
            let labFirstX = scaleLabIndexVirusIndex(labIndex, 0);
            let labLastX = scaleLabIndexVirusIndex(labIndex, labVirusCounts[labIndex] - 1);
            if (labIndex < labViruses.length - 1) {
                let markerLineX = labLastX + sizes.widthPerElement / 2;
                let markerLine = createVLine(markerLineX, colors.axis, sizes);
                plotSvg.appendChild(markerLine);
            }
            // NOTE(sen) Lab marker text
            let markerTextX = (labLastX + labFirstX) / 2;
            let markerText = createFacetLabel(markerTextX, colors.text, labs[labIndex], sizes);
            plotSvg.appendChild(markerText);
            for (let [virusIndex, virusName] of virusNames.entries()) {
                let virusData = labData.filter((row) => row.virus == virusName);
                let points = 0;
                let thisCol = colors.preVax;
                if (vaccineStrains.includes(virusName)) {
                    thisCol = colors.vaccinePreVax;
                }
                let xCoord = scaleLabIndexVirusIndex(labIndex, virusIndex + (Math.random() - 0.5) * 0.05);
                for (let row of virusData) {
                    let rise = row.titreRatio;
                    if (isGood(rise)) {
                        points += 1;
                        let yCoord = scaleLogrise(Math.log(rise) + Math.random() * 0.1);
                        let point = createPoint(xCoord, yCoord, thisCol + colChannel255ToString(opacities.points.value));
                        plotSvg.appendChild(point);
                        opacities.points.titrePlotElements.push(point);
                    }
                }
                // NOTE(sen) Counts
                let yCoord = sizes.axisPadTop + 2;
                let count = createCount(points, xCoord, yCoord, thisCol + colChannel255ToString(opacities.counts.value));
                plotSvg.appendChild(count);
                opacities.counts.titrePlotElements.push(count);
                // NOTE(sen) Boxplots
                let rises = virusData
                    .filter((row) => isGood(row.titreRatio))
                    .map((row) => Math.log(row.titreRatio));
                let boxplotStats = calcBoxplotStats(rises);
                if (boxplotStats !== null) {
                    let boxplot = createBoxplotElement(scaleLogrise(boxplotStats.bottom), scaleLogrise(boxplotStats.q25), scaleLogrise(boxplotStats.median), scaleLogrise(boxplotStats.q75), scaleLogrise(boxplotStats.top), sizes.boxPlotWidth, xCoord, thisCol + colChannel255ToString(opacities.boxplots.value));
                    plotSvg.appendChild(boxplot);
                    opacities.boxplots.titrePlotElements.push(boxplot);
                }
                // NOTE(sen) GMRs
                let gmrStats = calcMeanStats(rises);
                if (gmrStats !== null) {
                    let gmrErrorBar = createErrorBar(scaleLogrise(gmrStats.low), scaleLogrise(gmrStats.mean), scaleLogrise(gmrStats.high), xCoord, colChangeSaturation(thisCol + colChannel255ToString(opacities.means.value), 2));
                    plotSvg.appendChild(gmrErrorBar);
                    opacities.means.titrePlotElements.push(gmrErrorBar);
                }
            } // NOTE(sen) for (virus)
        } // NOTE(sen) for (lab)
    }
    return plotSvg;
};
const createTitreCladeAveragePlotSvg = (data, cladeFreqs, vaccineClades, opacities, colors, sizes, cladeFreqElements) => {
    let plotSvg = createSvgElement();
    if (data !== null && data !== undefined && data.length > 0) {
        //
        // SECTION Scales
        //
        // NOTE(sen) Y-Axis
        let scaleLogtitre = createScaleLogtitre(sizes);
        let scaleTitre = (val) => scaleLogtitre(Math.log(val));
        // NOTE(sen) X-Axis
        let labs = arrUnique(data.map((row) => row.testing_lab)).sort(stringSort);
        let labClades = [];
        let labCladeCounts = [];
        for (let lab of labs) {
            let labData = data.filter((row) => row.testing_lab == lab);
            let clades = arrUnique(labData.map((row) => row.clade)).sort(stringSort);
            labClades.push(clades);
            labCladeCounts.push(clades.length);
        }
        let plotWidth = calcPlotWidth(sizes, arrSum(labCladeCounts));
        const scaleLabIndexCladeIndex = createScaleFacetedCategorical(labCladeCounts, sizes);
        setPlotSvgSize(plotSvg, plotWidth, sizes.plotHeight);
        //
        // SECTION Y-Axis
        //
        let yAxis = createTitreAxisElement(colors, plotWidth, sizes, scaleTitre, "Clade average titre");
        plotSvg.appendChild(yAxis);
        //
        // SECTION X-axis
        //
        // NOTE(sen) Line
        plotSvg.appendChild(createXAxisBottomLine(plotWidth, sizes, colors));
        plotSvg.appendChild(createXAxisTopLine(plotWidth, sizes, colors));
        // NOTE(sen) Ticks and labels
        for (let [labIndex, cladeNames] of labClades.entries()) {
            for (let [cladeIndex, cladeName] of cladeNames.entries()) {
                let xCoord = scaleLabIndexCladeIndex(labIndex, cladeIndex);
                plotSvg.appendChild(createXTick(xCoord, sizes, colors));
                let cladeFreq = Math.round(cladeFreqs[cladeName] * 100);
                let label = createXLabel(cladeName + " (" + cladeFreq + "%)", -30, "end", xCoord, sizes, colors);
                plotSvg.appendChild(label);
                cladeFreqElements[cladeName].push(label);
            }
        }
        //
        // SECTION Main plot
        //
        // NOTE(sen) Line at 40
        let line40 = createDashedHLine(scaleTitre(40), plotWidth, sizes, colors.thresholdLine);
        plotSvg.appendChild(line40);
        opacities.line40.titreCladeAveragePlotElements.push(line40);
        // NOTE(sen) The rest of the plot
        for (let [labIndex, cladeNames] of labClades.entries()) {
            let labData = data.filter((row) => row.testing_lab == labs[labIndex]);
            let serumIds = arrUnique(labData.map((row) => row.serum_id));
            // NOTE(sen) Lab marker line
            let labFirstX = scaleLabIndexCladeIndex(labIndex, 0);
            let labLastX = scaleLabIndexCladeIndex(labIndex, labCladeCounts[labIndex] - 1);
            if (labIndex < labClades.length - 1) {
                let markerLineX = labLastX + sizes.widthPerElement / 2;
                let markerLine = createVLine(markerLineX, colors.axis, sizes);
                plotSvg.appendChild(markerLine);
            }
            // NOTE(sen) Lab marker text
            let markerTextX = (labLastX + labFirstX) / 2;
            let markerText = createFacetLabel(markerTextX, colors.text, labs[labIndex], sizes);
            plotSvg.appendChild(markerText);
            for (let [cladeIndex, cladeName] of cladeNames.entries()) {
                let cladeData = labData.filter((row) => row.clade == cladeName);
                let cladeDataPrevax = cladeData.filter((row) => row.timepoint === "Pre-vax");
                let cladeDataPostvax = cladeData.filter((row) => row.timepoint === "Post-vax");
                let preVaxPoints = 0;
                let postVaxPoints = 0;
                let thisPreVaxCol = colors.preVax;
                let thisPostVaxCol = colors.postVax;
                if (vaccineClades.includes(cladeName)) {
                    thisPreVaxCol = colors.vaccinePreVax;
                    thisPostVaxCol = colors.vaccinePostVax;
                }
                for (let serumId of serumIds) {
                    let preVaxData = cladeDataPrevax.filter((row) => row.serum_id == serumId);
                    let postVaxData = cladeDataPostvax.filter((row) => row.serum_id == serumId);
                    const drawPoint = (titre, timepoint) => {
                        let coords = null;
                        if (titre) {
                            let yCoord = scaleLogtitre(Math.log(titre));
                            let xCoord = scaleLabIndexCladeIndex(labIndex, cladeIndex + (Math.random() - 0.5) * 0.05) -
                                sizes.prePostDistance / 2;
                            let col = thisPreVaxCol;
                            if (timepoint === "Post-vax") {
                                xCoord += sizes.prePostDistance;
                                col = thisPostVaxCol;
                                postVaxPoints += 1;
                            }
                            else {
                                preVaxPoints += 1;
                            }
                            let point = createPoint(xCoord, yCoord, col + colChannel255ToString(opacities.points.value));
                            plotSvg.appendChild(point);
                            opacities.points.titreCladeAveragePlotElements.push(point);
                            coords = { x: xCoord, y: yCoord };
                        }
                        return coords;
                    };
                    let p1 = null;
                    if (preVaxData.length == 1) {
                        p1 = drawPoint(preVaxData[0].titreCladeAverage, "Pre-vax");
                    }
                    let p2 = null;
                    if (postVaxData.length == 1) {
                        p2 = drawPoint(postVaxData[0].titreCladeAverage, "Post-vax");
                    }
                    // NOTE(sen) Line
                    if (p1 != null && p2 != null) {
                        let line = createLine(p1.x, p2.x, p1.y, p2.y, thisPreVaxCol + colChannel255ToString(opacities.lines.value));
                        plotSvg.appendChild(line);
                        opacities.lines.titreCladeAveragePlotElements.push(line);
                    }
                } // NOTE(sen) for serum id
                // NOTE(sen) Point counts and boxplots
                for (let timepoint of ["Pre-vax", "Post-vax"]) {
                    // NOTE(sen) Counts
                    let col = thisPreVaxCol;
                    let xCoord = scaleLabIndexCladeIndex(labIndex, cladeIndex) -
                        sizes.prePostDistance / 2;
                    let countValue = preVaxPoints;
                    let titres = cladeDataPrevax;
                    if (timepoint == "Post-vax") {
                        xCoord += sizes.prePostDistance;
                        col = thisPostVaxCol;
                        countValue = postVaxPoints;
                        titres = cladeDataPostvax;
                    }
                    let yCoord = sizes.axisPadTop + 2;
                    let count = createCount(countValue, xCoord, yCoord, col + colChannel255ToString(opacities.counts.value));
                    plotSvg.appendChild(count);
                    opacities.counts.titreCladeAveragePlotElements.push(count);
                    // NOTE(sen) Boxplots
                    titres = titres
                        .filter((row) => isGood(row.titreCladeAverage))
                        .map((row) => Math.log(row.titreCladeAverage));
                    let boxplotStats = calcBoxplotStats(titres);
                    if (boxplotStats !== null) {
                        let boxplot = createBoxplotElement(scaleLogtitre(boxplotStats.bottom), scaleLogtitre(boxplotStats.q25), scaleLogtitre(boxplotStats.median), scaleLogtitre(boxplotStats.q75), scaleLogtitre(boxplotStats.top), sizes.boxPlotWidth, xCoord, col + colChannel255ToString(opacities.boxplots.value));
                        plotSvg.appendChild(boxplot);
                        opacities.boxplots.titreCladeAveragePlotElements.push(boxplot);
                    }
                    // NOTE(sen) GMTs
                    let gmtStats = calcMeanStats(titres);
                    if (gmtStats !== null) {
                        let gmtErrorBar = createErrorBar(scaleLogtitre(gmtStats.low), scaleLogtitre(gmtStats.mean), scaleLogtitre(gmtStats.high), xCoord, colChangeSaturation(col + colChannel255ToString(opacities.means.value), 2));
                        plotSvg.appendChild(gmtErrorBar);
                        opacities.means.titreCladeAveragePlotElements.push(gmtErrorBar);
                    }
                } // NOTE(sen) for timepoint
            } // NOTE(sen) for clade
        } // NOTE(sen) for lab
    } // NOTE(sen) if data
    return plotSvg;
};
const createRiseCladeAveragePlotSvg = (data, cladeFreqs, vaccineClades, opacities, colors, sizes, cladeFreqElements) => {
    let plotSvg = createSvgElement();
    if (data !== null && data !== undefined && data.length > 0) {
        //
        // SECTION Scales
        //
        // NOTE(sen) Y-Axis
        let scaleLogrise = createScaleLogtitre(sizes, true);
        let scaleRise = (val) => scaleLogrise(Math.log(val));
        // NOTE(sen) X-Axis
        let labs = arrUnique(data.map((row) => row.testing_lab)).sort(stringSort);
        let labClades = [];
        let labCladeCounts = [];
        for (let lab of labs) {
            let labData = data.filter((row) => row.testing_lab == lab);
            let clades = arrUnique(labData.map((row) => row.clade)).sort(stringSort);
            labClades.push(clades);
            labCladeCounts.push(clades.length);
        }
        let plotWidth = calcPlotWidth(sizes, arrSum(labCladeCounts));
        const scaleLabIndexCladeIndex = createScaleFacetedCategorical(labCladeCounts, sizes);
        setPlotSvgSize(plotSvg, plotWidth, sizes.plotHeight);
        //
        // SECTION Y-Axis
        //
        let yAxis = createTitreAxisElement(colors, plotWidth, sizes, scaleRise, "Clade average rise", true);
        plotSvg.appendChild(yAxis);
        //
        // SECTION X-axis
        //
        // NOTE(sen) Line
        plotSvg.appendChild(createXAxisBottomLine(plotWidth, sizes, colors));
        plotSvg.appendChild(createXAxisTopLine(plotWidth, sizes, colors));
        // NOTE(sen) Ticks and labels
        for (let [labIndex, cladeNames] of labClades.entries()) {
            for (let [cladeIndex, cladeName] of cladeNames.entries()) {
                let xCoord = scaleLabIndexCladeIndex(labIndex, cladeIndex);
                plotSvg.appendChild(createXTick(xCoord, sizes, colors));
                let cladeFreq = Math.round(cladeFreqs[cladeName] * 100);
                let label = createXLabel(cladeName + " (" + cladeFreq + "%)", -30, "end", xCoord, sizes, colors);
                plotSvg.appendChild(label);
                cladeFreqElements[cladeName].push(label);
            }
        }
        //
        // SECTION Main plot
        //
        // NOTE(sen) Line at 4
        let line4 = createDashedHLine(scaleRise(4), plotWidth, sizes, colors.thresholdLine);
        plotSvg.appendChild(line4);
        opacities.line40.titreCladeAveragePlotElements.push(line4);
        // NOTE(sen) The rest of the plot
        for (let [labIndex, cladeNames] of labClades.entries()) {
            let labData = data.filter((row) => row.testing_lab == labs[labIndex]);
            let serumIds = arrUnique(labData.map((row) => row.serum_id));
            // NOTE(sen) Lab marker line
            let labFirstX = scaleLabIndexCladeIndex(labIndex, 0);
            let labLastX = scaleLabIndexCladeIndex(labIndex, labCladeCounts[labIndex] - 1);
            if (labIndex < labClades.length - 1) {
                let markerLineX = labLastX + sizes.widthPerElement / 2;
                let markerLine = createVLine(markerLineX, colors.axis, sizes);
                plotSvg.appendChild(markerLine);
            }
            // NOTE(sen) Lab marker text
            let markerTextX = (labLastX + labFirstX) / 2;
            let markerText = createFacetLabel(markerTextX, colors.text, labs[labIndex], sizes);
            plotSvg.appendChild(markerText);
            for (let [cladeIndex, cladeName] of cladeNames.entries()) {
                let cladeData = labData.filter((row) => row.clade == cladeName);
                let points = 0;
                let thisCol = colors.preVax;
                if (vaccineClades.includes(cladeName)) {
                    thisCol = colors.vaccinePreVax;
                }
                let xCoord = scaleLabIndexCladeIndex(labIndex, cladeIndex + (Math.random() - 0.5) * 0.05);
                for (let row of cladeData) {
                    let rise = row.titreCladeAverageRatio;
                    if (isGood(rise)) {
                        points += 1;
                        let yCoord = scaleRise(rise);
                        let point = createPoint(xCoord, yCoord, thisCol + colChannel255ToString(opacities.points.value));
                        plotSvg.appendChild(point);
                        opacities.points.titreCladeAveragePlotElements.push(point);
                    }
                }
                // NOTE(sen) Counts
                let yCoord = sizes.axisPadTop + 2;
                let count = createCount(points, xCoord, yCoord, thisCol + colChannel255ToString(opacities.counts.value));
                plotSvg.appendChild(count);
                opacities.counts.titreCladeAveragePlotElements.push(count);
                // NOTE(sen) Boxplots
                cladeData = cladeData
                    .filter((row) => isGood(row.titreCladeAverageRatio))
                    .map((row) => Math.log(row.titreCladeAverageRatio));
                let boxplotStats = calcBoxplotStats(cladeData);
                if (boxplotStats !== null) {
                    let boxplot = createBoxplotElement(scaleLogrise(boxplotStats.bottom), scaleLogrise(boxplotStats.q25), scaleLogrise(boxplotStats.median), scaleLogrise(boxplotStats.q75), scaleLogrise(boxplotStats.top), sizes.boxPlotWidth, xCoord, thisCol + colChannel255ToString(opacities.boxplots.value));
                    plotSvg.appendChild(boxplot);
                    opacities.boxplots.titreCladeAveragePlotElements.push(boxplot);
                }
                // NOTE(sen) GMRs
                let gmrStats = calcMeanStats(cladeData);
                if (gmrStats !== null) {
                    let gmrErrorBar = createErrorBar(scaleLogrise(gmrStats.low), scaleLogrise(gmrStats.mean), scaleLogrise(gmrStats.high), xCoord, colChangeSaturation(thisCol + colChannel255ToString(opacities.means.value), 2));
                    plotSvg.appendChild(gmrErrorBar);
                    opacities.means.titreCladeAveragePlotElements.push(gmrErrorBar);
                }
            } // NOTE(sen) for clade
        } // NOTE(sen) for lab
    } // NOTE(sen) if data
    return plotSvg;
};
const createTitreCirculatingAveragePlotSvg = (data, opacities, colors, sizes) => {
    let plotSvg = createSvgElement();
    if (data !== null && data !== undefined && data.length > 0) {
        //
        // SECTION Scales
        //
        // NOTE(sen) Y-Axis
        let scaleLogtitre = createScaleLogtitre(sizes);
        let scaleTitre = (val) => scaleLogtitre(Math.log(val));
        // NOTE(sen) X-Axis
        let labs = arrUnique(data.map((row) => row.testing_lab)).sort(stringSort);
        let plotWidth = calcPlotWidth(sizes, labs.length);
        const scaleLabIndex = createScaleCategorical(labs.length, sizes);
        setPlotSvgSize(plotSvg, plotWidth, sizes.plotHeight);
        //
        // SECTION Y-Axis
        //
        let yAxis = createTitreAxisElement(colors, plotWidth, sizes, scaleTitre, "Circulating average titre");
        plotSvg.appendChild(yAxis);
        //
        // SECTION X-axis
        //
        // NOTE(sen) Line
        plotSvg.appendChild(createXAxisBottomLine(plotWidth, sizes, colors));
        plotSvg.appendChild(createXAxisTopLine(plotWidth, sizes, colors));
        // NOTE(sen) Ticks and labels
        for (let [labIndex, labName] of labs.entries()) {
            let xCoord = scaleLabIndex(labIndex);
            plotSvg.appendChild(createXTick(xCoord, sizes, colors));
            plotSvg.appendChild(createXLabel(labName, 0, "middle", xCoord, sizes, colors));
        }
        //
        // SECTION Main plot
        //
        // NOTE(sen) Line at 40
        let line40 = createDashedHLine(scaleTitre(40), plotWidth, sizes, colors.thresholdLine);
        plotSvg.appendChild(line40);
        opacities.line40.titreCirculatingAveragePlotElements.push(line40);
        // NOTE(sen) The rest of the plot
        for (let [labIndex, labName] of labs.entries()) {
            let labData = data.filter((row) => row.testing_lab == labName);
            let serumIds = arrUnique(labData.map((row) => row.serum_id));
            let labDataPrevax = labData.filter((row) => row.timepoint === "Pre-vax");
            let labDataPostvax = labData.filter((row) => row.timepoint === "Post-vax");
            let preVaxPoints = 0;
            let postVaxPoints = 0;
            for (let serumId of serumIds) {
                let preVaxData = labDataPrevax.filter((row) => row.serum_id == serumId);
                let postVaxData = labDataPostvax.filter((row) => row.serum_id == serumId);
                const drawPoint = (titre, timepoint) => {
                    let coords = null;
                    if (titre) {
                        let yCoord = scaleLogtitre(Math.log(titre));
                        let xCoord = scaleLabIndex(labIndex) - sizes.prePostDistance / 2;
                        let col = colors.preVax;
                        if (timepoint === "Post-vax") {
                            xCoord += sizes.prePostDistance;
                            col = colors.postVax;
                            postVaxPoints += 1;
                        }
                        else {
                            preVaxPoints += 1;
                        }
                        let point = createPoint(xCoord, yCoord, col + colChannel255ToString(opacities.points.value));
                        plotSvg.appendChild(point);
                        opacities.points.titreCirculatingAveragePlotElements.push(point);
                        coords = { x: xCoord, y: yCoord };
                    }
                    return coords;
                };
                let p1 = null;
                if (preVaxData.length == 1) {
                    p1 = drawPoint(preVaxData[0].titreCirculatingAverage, "Pre-vax");
                }
                let p2 = null;
                if (postVaxData.length == 1) {
                    p2 = drawPoint(postVaxData[0].titreCirculatingAverage, "Post-vax");
                }
                // NOTE(sen) Line
                if (p1 != null && p2 != null) {
                    let line = createLine(p1.x, p2.x, p1.y, p2.y, colors.preVax + colChannel255ToString(opacities.lines.value));
                    plotSvg.appendChild(line);
                    opacities.lines.titreCirculatingAveragePlotElements.push(line);
                }
            } // NOTE(sen) for serum id
            // NOTE(sen) Point counts and boxplots
            for (let timepoint of ["Pre-vax", "Post-vax"]) {
                // NOTE(sen) Counts
                let col = colors.preVax;
                let xCoord = scaleLabIndex(labIndex) - sizes.prePostDistance / 2;
                let countValue = preVaxPoints;
                let titres = labDataPrevax;
                if (timepoint == "Post-vax") {
                    xCoord += sizes.prePostDistance;
                    col = colors.postVax;
                    countValue = postVaxPoints;
                    titres = labDataPostvax;
                }
                let yCoord = sizes.axisPadTop + 2;
                let count = createCount(countValue, xCoord, yCoord, col + colChannel255ToString(opacities.counts.value));
                plotSvg.appendChild(count);
                opacities.counts.titreCirculatingAveragePlotElements.push(count);
                // NOTE(sen) Boxplots
                titres = titres
                    .filter((row) => isGood(row.titreCirculatingAverage))
                    .map((row) => Math.log(row.titreCirculatingAverage));
                let boxplotStats = calcBoxplotStats(titres);
                if (boxplotStats !== null) {
                    let boxplot = createBoxplotElement(scaleLogtitre(boxplotStats.bottom), scaleLogtitre(boxplotStats.q25), scaleLogtitre(boxplotStats.median), scaleLogtitre(boxplotStats.q75), scaleLogtitre(boxplotStats.top), sizes.boxPlotWidth, xCoord, col + colChannel255ToString(opacities.boxplots.value));
                    plotSvg.appendChild(boxplot);
                    opacities.boxplots.titreCirculatingAveragePlotElements.push(boxplot);
                }
                // NOTE(sen) GMTs
                let gmtStats = calcMeanStats(titres);
                if (gmtStats !== null) {
                    let gmtErrorBar = createErrorBar(scaleLogtitre(gmtStats.low), scaleLogtitre(gmtStats.mean), scaleLogtitre(gmtStats.high), xCoord, colChangeSaturation(col + colChannel255ToString(opacities.means.value), 2));
                    plotSvg.appendChild(gmtErrorBar);
                    opacities.means.titreCirculatingAveragePlotElements.push(gmtErrorBar);
                }
            } // NOTE(sen) for timepoint
        } // NOTE(sen) for lab
    } // NOTE(sen) if data
    return plotSvg;
};
const createRiseCirculatingAveragePlotSvg = (data, opacities, colors, sizes) => {
    let plotSvg = createSvgElement();
    if (data !== null && data !== undefined && data.length > 0) {
        //
        // SECTION Scales
        //
        // NOTE(sen) Y-Axis
        let scaleLogrise = createScaleLogtitre(sizes, true);
        let scaleRise = (val) => scaleLogrise(Math.log(val));
        // NOTE(sen) X-Axis
        let labs = arrUnique(data.map((row) => row.testing_lab)).sort(stringSort);
        let plotWidth = calcPlotWidth(sizes, labs.length);
        const scaleLabIndex = createScaleCategorical(labs.length, sizes);
        setPlotSvgSize(plotSvg, plotWidth, sizes.plotHeight);
        //
        // SECTION Y-Axis
        //
        let yAxis = createTitreAxisElement(colors, plotWidth, sizes, scaleRise, "Circulating average rise", true);
        plotSvg.appendChild(yAxis);
        //
        // SECTION X-axis
        //
        // NOTE(sen) Line
        plotSvg.appendChild(createXAxisBottomLine(plotWidth, sizes, colors));
        plotSvg.appendChild(createXAxisTopLine(plotWidth, sizes, colors));
        // NOTE(sen) Ticks and labels
        for (let [labIndex, labName] of labs.entries()) {
            let xCoord = scaleLabIndex(labIndex);
            plotSvg.appendChild(createXTick(xCoord, sizes, colors));
            plotSvg.appendChild(createXLabel(labName, 0, "middle", xCoord, sizes, colors));
        }
        //
        // SECTION Main plot
        //
        // NOTE(sen) Line at 4
        let line4 = createDashedHLine(scaleRise(4), plotWidth, sizes, colors.thresholdLine);
        plotSvg.appendChild(line4);
        opacities.line40.titreCirculatingAveragePlotElements.push(line4);
        let col = colors.preVax;
        // NOTE(sen) The rest of the plot
        for (let [labIndex, labName] of labs.entries()) {
            let labData = data.filter((row) => row.testing_lab == labName);
            let points = 0;
            let xCoord = scaleLabIndex(labIndex);
            for (let row of labData) {
                let rise = row.titreCirculatingAverageRatio;
                if (isGood(rise)) {
                    points += 1;
                    let yCoord = scaleRise(rise);
                    let point = createPoint(xCoord, yCoord, col + colChannel255ToString(opacities.points.value));
                    plotSvg.appendChild(point);
                    opacities.points.titreCirculatingAveragePlotElements.push(point);
                }
            }
            // NOTE(sen) Counts
            let yCoord = sizes.axisPadTop + 2;
            let count = createCount(points, xCoord, yCoord, col + colChannel255ToString(opacities.counts.value));
            plotSvg.appendChild(count);
            opacities.counts.titreCirculatingAveragePlotElements.push(count);
            // NOTE(sen) Boxplots
            labData = labData
                .filter((row) => isGood(row.titreCirculatingAverageRatio))
                .map((row) => Math.log(row.titreCirculatingAverageRatio));
            let boxplotStats = calcBoxplotStats(labData);
            if (boxplotStats !== null) {
                let boxplot = createBoxplotElement(scaleLogrise(boxplotStats.bottom), scaleLogrise(boxplotStats.q25), scaleLogrise(boxplotStats.median), scaleLogrise(boxplotStats.q75), scaleLogrise(boxplotStats.top), sizes.boxPlotWidth, xCoord, col + colChannel255ToString(opacities.boxplots.value));
                plotSvg.appendChild(boxplot);
                opacities.boxplots.titreCirculatingAveragePlotElements.push(boxplot);
            }
            // NOTE(sen) GMRs
            let gmrStats = calcMeanStats(labData);
            if (gmrStats !== null) {
                let gmrErrorBar = createErrorBar(scaleLogrise(gmrStats.low), scaleLogrise(gmrStats.mean), scaleLogrise(gmrStats.high), xCoord, colChangeSaturation(col + colChannel255ToString(opacities.means.value), 2));
                plotSvg.appendChild(gmrErrorBar);
                opacities.means.titreCirculatingAveragePlotElements.push(gmrErrorBar);
            }
        } // NOTE(sen) for lab
    } // NOTE(sen) if data
    return plotSvg;
};
const areAllFiltersSet = (filters) => {
    let allFiltersSet = true;
    for (let varName of Object.keys(filters)) {
        if (filters[varName].selected === null) {
            allFiltersSet = false;
            break;
        }
    }
    return allFiltersSet;
};
const updateSliderSubtype = (filters, subtypeSlidersContainers) => {
    for (let [subtype, slidersContainer] of Object.entries(subtypeSlidersContainers)) {
        if (subtype === filters.subtype.selected) {
            slidersContainer.style.display = "block";
        }
        else {
            slidersContainer.style.display = "none";
        }
    }
};
const updateFilterColors = (data, filters) => {
    for (let varName of Object.keys(filters)) {
        let otherVarNames = Object.keys(filters).filter((key) => key !== varName);
        for (let [optionIndex, option] of filters[varName].options.entries()) {
            let testRows = data.filter((row) => {
                let result = row[varName] === option;
                if (result) {
                    for (let otherVarName of otherVarNames) {
                        result =
                            row[otherVarName] === filters[otherVarName].selected;
                        if (!result) {
                            break;
                        }
                    }
                }
                return result;
            });
            let element = filters[varName].elements[optionIndex];
            if (testRows.length === 0) {
                element.style.color = "var(--color-error)";
            }
            else {
                element.style.color = "inherit";
            }
        }
    }
};
const findNonEmptyFilterSubset = (data, filters, subtypeSlidersContainers) => {
    if (!areAllFiltersSet(filters)) {
        let currentSettings = [];
        for (let [filterIndex, varName] of Object.keys(filters).entries()) {
            currentSettings.push({
                name: varName,
                lastIndex: filters[varName].options.length - 1,
                currentIndex: 0,
            });
        }
        let currentFilteredDataRows = 0;
        let currentlyIncrementing = currentSettings.length - 1;
        while (currentFilteredDataRows === 0) {
            for (let [filterIndex, varName] of Object.keys(filters).entries()) {
                filters[varName].selected =
                    filters[varName].options[currentSettings[filterIndex].currentIndex];
                for (let [optionIndex, optionEl] of filters[varName].elements.entries()) {
                    if (optionIndex === currentSettings[filterIndex].currentIndex) {
                        optionEl.style.background = "var(--color-selected)";
                    }
                    else {
                        optionEl.style.background = "inherit";
                    }
                }
            }
            let testRows = data.filter((row) => {
                let result = true;
                for (let varName of Object.keys(filters)) {
                    result = row[varName] === filters[varName].selected;
                    if (!result) {
                        break;
                    }
                }
                return result;
            });
            currentFilteredDataRows = testRows.length;
            if (currentSettings[currentlyIncrementing].currentIndex ===
                currentSettings[currentlyIncrementing].lastIndex) {
                currentSettings[currentlyIncrementing].currentIndex = 0;
                currentlyIncrementing -= 1;
                if (currentlyIncrementing === -1) {
                    currentlyIncrementing = currentSettings.length - 1;
                }
            }
            if (currentSettings[currentlyIncrementing].currentIndex ===
                currentSettings[currentlyIncrementing].lastIndex) {
                break;
            }
            else {
                currentSettings[currentlyIncrementing].currentIndex += 1;
            }
        }
        updateSliderSubtype(filters, subtypeSlidersContainers);
        updateFilterColors(data, filters);
    }
};
const createSubsetFilter = (filters) => {
    return (row) => {
        let result = true;
        for (let varName of Object.keys(filters)) {
            result = row[varName] === filters[varName].selected;
            if (!result) {
                break;
            }
        }
        return result;
    };
};
const updateTitrePlot = (titres, rises, cladeFreqs, vaccineViruses, filters, opacities, colors, defaultPlotSizes, container, cladeFreqElements) => {
    if (areAllFiltersSet(filters)) {
        const subsetFilter = createSubsetFilter(filters);
        let dataSubset = titres.filter(subsetFilter);
        let dataRisesSubset = rises.filter(subsetFilter);
        removeChildren(container.element);
        for (let varName of Object.keys(opacities)) {
            opacities[varName].titrePlotElements = [];
        }
        container.titres = addEl(container.element, createTitrePlotSvg(dataSubset, cladeFreqs, vaccineViruses, opacities, colors, defaultPlotSizes, cladeFreqElements));
        container.rises = addEl(container.element, createRisePlotSvg(dataRisesSubset, cladeFreqs, vaccineViruses, opacities, colors, defaultPlotSizes, cladeFreqElements));
    }
};
const updateTitreCladeAveragePlot = (cladeAverageTitres, cladeAverageRises, cladeFreqs, filters, opacities, colors, defaultPlotSizes, container, cladeFreqElements) => {
    if (areAllFiltersSet(filters)) {
        const subsetFilter = createSubsetFilter(filters);
        let dataSubsetCladeAverages = cladeAverageTitres.filter(subsetFilter);
        let dataSubsetCladeAverageRises = cladeAverageRises.filter(subsetFilter);
        removeChildren(container.element);
        for (let varName of Object.keys(opacities)) {
            opacities[varName].titreCladeAveragePlotElements = [];
        }
        let plotSizes = reduceAxisPadBottom(100, defaultPlotSizes);
        let vaccineClades = ["A.5a.2", "3C.2a1b.2a.2", "V1A.3a", "Y3"];
        container.titres = addEl(container.element, createTitreCladeAveragePlotSvg(dataSubsetCladeAverages, cladeFreqs, vaccineClades, opacities, colors, plotSizes, cladeFreqElements));
        container.rises = addEl(container.element, createRiseCladeAveragePlotSvg(dataSubsetCladeAverageRises, cladeFreqs, vaccineClades, opacities, colors, plotSizes, cladeFreqElements));
    }
};
const updateTitreCirculatingAveragePlot = (circulatingAverageTitres, circulatingAverageRises, filters, opacities, colors, defaultPlotSizes, container) => {
    if (areAllFiltersSet(filters)) {
        const subsetFilter = createSubsetFilter(filters);
        let dataSubsetCirculatingAverages = circulatingAverageTitres.filter(subsetFilter);
        let dataSubsetCirculatingAverageRises = circulatingAverageRises.filter(subsetFilter);
        removeChildren(container.element);
        for (let varName of Object.keys(opacities)) {
            opacities[varName].titreCirculatingAveragePlotElements = [];
        }
        let plotSizes = reduceAxisPadBottom(40, defaultPlotSizes);
        container.titres = addEl(container.element, createTitreCirculatingAveragePlotSvg(dataSubsetCirculatingAverages, opacities, colors, plotSizes));
        container.rises = addEl(container.element, createRiseCirculatingAveragePlotSvg(dataSubsetCirculatingAverageRises, opacities, colors, plotSizes));
    }
};
const updateCirculatingAverageData = (cladeAverageTitres, cladeFreqs, filters, opacities, colors, defaultPlotSizes, plotContainer) => {
    let circulatingAverageTitres = [];
    let circulatingAverageRises = [];
    if (cladeAverageTitres.length > 0) {
        // NOTE(sen) Titres
        const titresGroupVars = Object.keys(cladeAverageTitres[0]).filter((key) => key !== "titreCladeAverage" &&
            key !== "clade" &&
            key !== "clade_freq");
        const titresGroupedData = groupByMultiple(cladeAverageTitres, titresGroupVars);
        circulatingAverageTitres = summariseGrouped(titresGroupedData, titresGroupVars, (data) => {
            let sumLogTitres = 0;
            let sumWeights = 0;
            for (let row of data) {
                let weight = cladeFreqs[row.clade];
                let titre = row.titreCladeAverage;
                if (isGood(weight) && isGood(titre)) {
                    sumLogTitres += weight * Math.log(row.titreCladeAverage);
                    sumWeights += weight;
                }
            }
            let weightedMean = null;
            if (sumWeights !== 0) {
                weightedMean = Math.exp(sumLogTitres / sumWeights);
            }
            return { titreCirculatingAverage: weightedMean };
        });
        // NOTE(sen) Rises
        const risesGroupVars = Object.keys(circulatingAverageTitres[0]).filter((key) => key !== "titreCirculatingAverage" && key !== "timepoint");
        const risesGroupedData = groupByMultiple(circulatingAverageTitres, risesGroupVars);
        circulatingAverageRises = summariseGrouped(risesGroupedData, risesGroupVars, (data) => {
            let preVaxArr = data.filter((row) => row.timepoint === "Pre-vax");
            let postVaxArr = data.filter((row) => row.timepoint === "Post-vax");
            let titreRatio = null;
            if (preVaxArr.length === 1 && postVaxArr.length === 1) {
                let preVax = preVaxArr[0].titreCirculatingAverage;
                let postVax = postVaxArr[0].titreCirculatingAverage;
                if (isGood(preVax) && isGood(postVax)) {
                    titreRatio = postVax / preVax;
                }
            }
            return { titreCirculatingAverageRatio: titreRatio };
        });
        updateTitreCirculatingAveragePlot(circulatingAverageTitres, circulatingAverageRises, filters, opacities, colors, defaultPlotSizes, plotContainer);
    }
    return { titres: circulatingAverageTitres, rises: circulatingAverageRises };
};
const updateData = (contentsString, opacities, colors, defaultPlotSizes, plotContainers, slidersContainer, filtersContainer) => {
    if (contentsString.length > 0) {
        // NOTE(sen) Main data
        const data = parseData(contentsString);
        // NOTE(sen) Vaccine viruses
        const vaccineViruses = [];
        for (let row of data) {
            if (row.vaccine_strain === true) {
                if (!vaccineViruses.includes(row.virus)) {
                    vaccineViruses.push(row.virus);
                }
            }
        }
        // NOTE(sen) Clade frequencies
        const cladeFreqs = {};
        const cladeFreqsDefault = {};
        for (let row of data) {
            if (cladeFreqs[row.clade] === undefined) {
                cladeFreqs[row.clade] = Math.round(row.clade_freq * 100) / 100;
                cladeFreqsDefault[row.clade] = cladeFreqs[row.clade];
            }
        }
        // NOTE(sen) Subtype clades
        const subtypeClades = {};
        if (data.length > 0) {
            let subtypes = arrUnique(data.map((row) => row.subtype)).sort(stringSort);
            for (let subtype of subtypes) {
                let clades = arrUnique(data
                    .filter((row) => row.subtype === subtype)
                    .map((row) => row.clade));
                subtypeClades[subtype] = clades.sort(stringSort);
            }
        }
        // NOTE(sen) Populate clade frequency sliders
        removeChildren(slidersContainer);
        const subtypeSlidersContainers = {};
        const cladeFreqElements = {};
        for (let [subtype, clades] of Object.entries(subtypeClades)) {
            let subtypeContainer = addDiv(slidersContainer);
            subtypeContainer.style.marginBottom = "5px";
            for (let clade of clades) {
                let slider = document.createElement("div");
                let name = document.createElement("div");
                name.innerHTML =
                    clade + " (" + Math.round(cladeFreqs[clade] * 100) + "%)";
                name.style.textAlign = "center";
                let reset = document.createElement("div");
                reset.innerHTML = "⟲";
                reset.style.cursor = "pointer";
                reset.style.color = "var(--color-border)";
                let top = document.createElement("div");
                top.style.display = "flex";
                top.style.justifyContent = "space-between";
                top.appendChild(name);
                top.appendChild(reset);
                let input = document.createElement("input");
                input.setAttribute("type", "range");
                input.setAttribute("min", "0");
                input.setAttribute("max", "100");
                input.value = `${cladeFreqs[clade] * 100}`;
                input.addEventListener("input", (event) => {
                    const val = event.target.value;
                    cladeFreqs[clade] = parseFloat(val) / 100;
                    name.innerHTML = clade + " (" + val + "%)";
                    for (let el of cladeFreqElements[clade]) {
                        el.innerHTML = clade + " (" + val + "%)";
                    }
                    updateCirculatingAverageData(cladeAverageTitres, cladeFreqs, filters, opacities, colors, defaultPlotSizes, plotContainers.circulatingAverage);
                    if (cladeFreqs[clade] === cladeFreqsDefault[clade]) {
                        reset.style.color = "var(--color-border)";
                    }
                    else {
                        reset.style.color = "var(--color-text)";
                    }
                });
                reset.addEventListener("click", (event) => {
                    input.value = `${cladeFreqsDefault[clade] * 100}`;
                    input.dispatchEvent(new Event("input"));
                });
                slider.appendChild(top);
                slider.appendChild(input);
                subtypeContainer.appendChild(slider);
                cladeFreqElements[clade] = [];
            }
            subtypeSlidersContainers[subtype] = subtypeContainer;
        }
        // NOTE(sen) Work out clade-average titres
        let cladeAverageTitres = [];
        if (data.length > 0) {
            let groupVars = Object.keys(data[0]).filter((key) => key !== "titre" && key !== "virus" && key !== "egg_cell" && key !== "vaccine_strain");
            let groupedData = groupByMultiple(data.filter((row) => row.clade !== "unassigned"), groupVars);
            cladeAverageTitres = summariseGrouped(groupedData, groupVars, (data) => {
                let dataSubsetNoEggs = data;
                if (dataSubsetNoEggs.length > 1) {
                    dataSubsetNoEggs = dataSubsetNoEggs.filter((row) => row.egg_cell === "Cell");
                }
                let logtitres = dataSubsetNoEggs
                    .filter(row => isGood(row.titre))
                    .map((row) => Math.log(row.titre));
                let logmean = arrMean(logtitres);
                return { titreCladeAverage: Math.exp(logmean) };
            });
        }
        const filters = {
            subtype: { elements: [], options: [], selected: null },
            serum_source: { elements: [], options: [], selected: null },
            cohort: { elements: [], options: [], selected: null },
        };
        // NOTE(sen) Populate filters
        for (let varName of Object.keys(filters)) {
            filters[varName].selected = null;
            filters[varName].options = arrUnique(data.map((row) => row[varName]));
            switch (varName) {
                case "cohort": {
                    filters[varName].options = filters[varName]
                        .options.sort(stringSort);
                    break;
                }
                case "subtype": {
                    filters[varName].options = filters[varName]
                        .options.sort(desiredOrderSort(["H1", "H3", "BVic"]));
                    break;
                }
                case "serum_source": {
                    filters[varName].options = filters[varName]
                        .options.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
                    break;
                }
            }
        }
        // NOTE(sen) Draw the newly populated filters
        removeChildren(filtersContainer);
        for (let varName of Object.keys(filters)) {
            let filterEl = document.createElement("div");
            filterEl.style.display = "flex";
            filterEl.style.flexDirection = "column";
            filterEl.style.marginBottom = "10px";
            filterEl.style.flexGrow = "1";
            filters[varName].elements = [];
            for (let option of filters[varName].options) {
                let optionEl = document.createElement("div");
                optionEl.innerHTML = option;
                optionEl.addEventListener("click", (event) => {
                    filters[varName].selected = option;
                    for (let otherOption of filters[varName].elements) {
                        otherOption.style.background = "inherit";
                    }
                    optionEl.style.background = "var(--color-selected)";
                    updateTitrePlot(data, rises, cladeFreqs, vaccineViruses, filters, opacities, colors, defaultPlotSizes, plotContainers.noSummary, cladeFreqElements);
                    updateTitreCladeAveragePlot(cladeAverageTitres, cladeAverageRises, cladeFreqs, filters, opacities, colors, defaultPlotSizes, plotContainers.cladeAverage, cladeFreqElements);
                    updateTitreCirculatingAveragePlot(circulatingAverageTitres, circulatingAverageRises, filters, opacities, colors, defaultPlotSizes, plotContainers.circulatingAverage);
                    updateFilterColors(data, filters);
                    if (varName === "subtype") {
                        updateSliderSubtype(filters, subtypeSlidersContainers);
                    }
                });
                optionEl.style.padding = "5px";
                optionEl.style.border = "1px solid var(--color-border)";
                optionEl.style.cursor = "pointer";
                optionEl.style.textAlign = "center";
                if (option === filters[varName].selected) {
                    optionEl.style.background = "var(--color-selected)";
                }
                filterEl.appendChild(optionEl);
                filters[varName].elements.push(optionEl);
            }
            filtersContainer.appendChild(filterEl);
        }
        // NOTE(sen) Titre rises
        let rises = [];
        if (data.length > 0) {
            let groupVars = Object.keys(data[0]).filter((key) => key !== "titre" && key !== "timepoint");
            let groupedData = groupByMultiple(data, groupVars);
            rises = summariseGrouped(groupedData, groupVars, (data) => {
                let preVaxArr = data.filter((row) => row.timepoint === "Pre-vax");
                let postVaxArr = data.filter((row) => row.timepoint === "Post-vax");
                let titreRatio = null;
                if (preVaxArr.length === 1 && postVaxArr.length === 1) {
                    let preVax = preVaxArr[0].titre;
                    let postVax = postVaxArr[0].titre;
                    if (isGood(preVax) && isGood(postVax)) {
                        titreRatio = postVax / preVax;
                    }
                }
                return { titreRatio: titreRatio };
            });
        }
        // NOTE(sen) Clade-average rises
        let cladeAverageRises = [];
        if (cladeAverageTitres.length > 0) {
            let groupVars = Object.keys(cladeAverageTitres[0]).filter((key) => key !== "titreCladeAverage" && key !== "timepoint");
            let groupedData = groupByMultiple(cladeAverageTitres, groupVars);
            cladeAverageRises = summariseGrouped(groupedData, groupVars, (data) => {
                let preVaxArr = data.filter((row) => row.timepoint === "Pre-vax");
                let postVaxArr = data.filter((row) => row.timepoint === "Post-vax");
                let titreRatio = null;
                if (preVaxArr.length === 1 && postVaxArr.length === 1) {
                    let preVax = preVaxArr[0].titreCladeAverage;
                    let postVax = postVaxArr[0].titreCladeAverage;
                    if (isGood(preVax) && isGood(postVax)) {
                        titreRatio = postVax / preVax;
                    }
                }
                return { titreCladeAverageRatio: titreRatio };
            });
        }
        findNonEmptyFilterSubset(data, filters, subtypeSlidersContainers);
        const circulatingAverages = updateCirculatingAverageData(cladeAverageTitres, cladeFreqs, filters, opacities, colors, defaultPlotSizes, plotContainers.circulatingAverage);
        const circulatingAverageTitres = circulatingAverages.titres;
        const circulatingAverageRises = circulatingAverages.rises;
        updateTitrePlot(data, rises, cladeFreqs, vaccineViruses, filters, opacities, colors, defaultPlotSizes, plotContainers.noSummary, cladeFreqElements);
        updateTitreCladeAveragePlot(cladeAverageTitres, cladeAverageRises, cladeFreqs, filters, opacities, colors, defaultPlotSizes, plotContainers.cladeAverage, cladeFreqElements);
    }
};
const main = () => {
    const mainEl = document.getElementById("main");
    const inputBarSize = 200;
    const inputContainer = addDiv(mainEl);
    inputContainer.style.display = "flex";
    inputContainer.style.flexDirection = "column";
    inputContainer.style.alignItems = "left";
    inputContainer.style.width = inputBarSize + "px";
    inputContainer.style.marginRight = "10px";
    inputContainer.style.height = "100vh";
    inputContainer.style.overflowY = "scroll";
    inputContainer.style.overflowX = "hidden";
    inputContainer.style.flexShrink = "0";
    const plotContainer = addDiv(mainEl);
    plotContainer.style.display = "flex";
    plotContainer.style.flexDirection = "column";
    plotContainer.style.alignItems = "top";
    plotContainer.style.height = "calc(100vh - 0px)";
    plotContainer.style.overflowY = "scroll";
    plotContainer.style.overflowX = "hidden";
    const createPlotContainer = () => {
        let el = createDiv();
        el.style.flexShrink = "0";
        el.style.overflowX = "scroll";
        el.style.overflowY = "hidden";
        return el;
    };
    const plotContainers = {
        noSummary: { element: null, titres: null, rises: null },
        cladeAverage: { element: null, titres: null, rises: null },
        circulatingAverage: { element: null, titres: null, rises: null },
    };
    for (let subPlotContainer of Object.keys(plotContainers)) {
        if (subPlotContainer !== "element") {
            let el = addEl(plotContainer, createPlotContainer());
            plotContainers[subPlotContainer].element = el;
        }
    }
    const fileInputContainer = addDiv(inputContainer);
    const fileInputLabel = addDiv(fileInputContainer);
    fileInputLabel.innerHTML = "SELECT FILE";
    fileInputLabel.style.position = "absolute";
    fileInputLabel.style.top = "0px";
    fileInputLabel.style.left = "0px";
    fileInputLabel.style.textAlign = "center";
    fileInputLabel.style.width = "100%";
    fileInputLabel.style.height = "100%";
    fileInputLabel.style.lineHeight = "50px";
    fileInputLabel.style.fontWeight = "bold";
    fileInputLabel.style.letterSpacing = "2px";
    const fileInputHandler = (event) => {
        fileInputWholePage.style.visibility = "hidden";
        let file = event.target.files[0];
        if (file !== null && file !== undefined) {
            fileInputLabel.innerHTML = file.name;
            file.text().then((string) => updateData(string, opacities, colors, defaultPlotSizes, plotContainers, slidersContainer, filtersContainer));
        }
    };
    const fileInput = addEl(fileInputContainer, createEl("input"));
    fileInput.setAttribute("type", "file");
    fileInput.addEventListener("change", fileInputHandler);
    fileInput.style.opacity = "0";
    fileInput.style.cursor = "pointer";
    fileInput.style.width = "100%";
    fileInput.style.height = "100%";
    fileInputContainer.style.border = "1px dashed var(--color-fileSelectBorder)";
    fileInputContainer.style.width = "100%";
    fileInputContainer.style.height = fileInputLabel.style.lineHeight;
    fileInputContainer.style.position = "relative";
    fileInputContainer.style.flexShrink = "0";
    fileInputContainer.style.boxSizing = "border-box";
    fileInputContainer.style.marginBottom = "20px";
    const fileInputWholePage = addEl(mainEl, createEl("input"));
    fileInputWholePage.type = "file";
    fileInputWholePage.addEventListener("change", fileInputHandler);
    fileInputWholePage.style.position = "fixed";
    fileInputWholePage.style.top = "0";
    fileInputWholePage.style.left = "0";
    fileInputWholePage.style.width = "100%";
    fileInputWholePage.style.height = "100%";
    fileInputWholePage.style.opacity = "0.5";
    fileInputWholePage.style.visibility = "hidden";
    fileInputWholePage.style.zIndex = "999";
    fileInputWholePage.style.background = "gray";
    window.addEventListener("dragenter", () => fileInputWholePage.style.visibility = "visible");
    fileInputWholePage.addEventListener("dragleave", () => fileInputWholePage.style.visibility = "hidden");
    const colors = {
        theme: "dark",
        preVax: "#308A36",
        postVax: "#7FA438",
        vaccinePreVax: "#8E3164",
        vaccinePostVax: "#B0403D",
        text: "var(--color-text)",
        axis: "#aaaaaa",
        thresholdLine: "#aaaaaa",
        grid: "#99999944",
    };
    const themeSwitch = addDiv(inputContainer);
    themeSwitch.style.display = "flex";
    themeSwitch.style.flexDirection = "row";
    themeSwitch.style.marginBottom = "20px";
    themeSwitch.style.cursor = "pointer";
    const themeOptions = ["dark", "light"];
    const optionEls = [];
    for (let option of themeOptions) {
        const optionEl = addDiv(themeSwitch);
        optionEl.textContent = option.toUpperCase();
        optionEl.style.padding = "5px";
        optionEl.style.border = "1px solid var(--color-border)";
        optionEl.style.flexGrow = "1";
        optionEl.style.textAlign = "center";
        optionEl.style.fontWeight = "bold";
        optionEl.style.letterSpacing = "2px";
        if (option === colors.theme) {
            optionEl.style.background = "var(--color-selected)";
        }
        optionEls.push(optionEl);
    }
    themeSwitch.addEventListener("click", (event) => {
        let targetTheme = "dark";
        let selectionTarget = 0;
        let inheritTarget = 1;
        if (colors.theme === "dark") {
            targetTheme = "light";
            selectionTarget = 1;
            inheritTarget = 0;
        }
        colors.theme = targetTheme;
        document.documentElement.setAttribute("theme", targetTheme);
        optionEls[selectionTarget].style.background = "var(--color-selected)";
        optionEls[inheritTarget].style.background = "inherit";
    });
    const modeSwitch = addDiv(inputContainer);
    modeSwitch.style.display = "flex";
    modeSwitch.style.flexDirection = "row";
    modeSwitch.style.marginBottom = "20px";
    modeSwitch.style.cursor = "pointer";
    let plotMode = ["titres", "rises"];
    const modeOptions = ["titres", "rises"];
    for (let option of modeOptions) {
        const optionEl = addDiv(modeSwitch);
        optionEl.textContent = option.toUpperCase();
        optionEl.style.padding = "5px";
        optionEl.style.border = "1px solid var(--color-border)";
        optionEl.style.flexGrow = "1";
        optionEl.style.textAlign = "center";
        optionEl.style.fontWeight = "bold";
        optionEl.style.letterSpacing = "2px";
        if (plotMode.includes(option)) {
            optionEl.style.background = "var(--color-selected)";
        }
        optionEl.addEventListener("click", (event) => {
            let targetVisibility = "block";
            if (plotMode.includes(option)) {
                optionEl.style.background = "inherit";
                plotMode = plotMode.filter((op) => op !== option);
                targetVisibility = "none";
            }
            else {
                optionEl.style.background = "var(--color-selected)";
                plotMode.push(option);
            }
            for (let summaryType of Object.keys(plotContainers)) {
                if (summaryType !== "element") {
                    plotContainers[summaryType][option].style.display = targetVisibility;
                }
            }
        });
    }
    const opacitiesContainer = addDiv(inputContainer);
    opacitiesContainer.style.marginBottom = "20px";
    const opacities = {
        points: {
            titrePlotElements: [],
            titreCladeAveragePlotElements: [],
            titreCirculatingAveragePlotElements: [],
            value: 255,
            default: 255,
        },
        lines: {
            titrePlotElements: [],
            titreCladeAveragePlotElements: [],
            titreCirculatingAveragePlotElements: [],
            value: 127,
            default: 127,
        },
        boxplots: {
            titrePlotElements: [],
            titreCladeAveragePlotElements: [],
            titreCirculatingAveragePlotElements: [],
            value: 255,
            default: 255,
        },
        counts: {
            titrePlotElements: [],
            titreCladeAveragePlotElements: [],
            titreCirculatingAveragePlotElements: [],
            value: 255,
            default: 255,
        },
        line40: {
            titrePlotElements: [],
            titreCladeAveragePlotElements: [],
            titreCirculatingAveragePlotElements: [],
            value: 255,
            default: 255,
        },
        means: {
            titrePlotElements: [],
            titreCladeAveragePlotElements: [],
            titreCirculatingAveragePlotElements: [],
            value: 255,
            default: 255,
        },
    };
    for (let varName of Object.keys(opacities)) {
        const opacityEl = createDiv();
        opacityEl.textContent = varName.toUpperCase();
        opacityEl.addEventListener("click", (event) => {
            let targetOpacity = 0;
            if (opacities[varName].value === 0) {
                targetOpacity = opacities[varName].default;
            }
            opacities[varName].value = targetOpacity;
            if (targetOpacity > 0) {
                event.target.style.background = "var(--color-selected)";
            }
            else {
                event.target.style.background = "inherit";
            }
            let alpha = colChannel255ToString(targetOpacity);
            let attrNames = ["stroke"];
            if (varName === "counts" || varName === "points") {
                attrNames = ["fill"];
            }
            else if (varName === "means") {
                attrNames.push("fill");
            }
            for (let [name, val] of Object.entries(opacities[varName])) {
                if (name.endsWith("Elements")) {
                    for (let element of opacities[varName][name]) {
                        for (let attrName of attrNames) {
                            let currentColFull = element.getAttribute(attrName);
                            let currentColNoAlpha = currentColFull.slice(0, 7);
                            let newCol = currentColNoAlpha + alpha;
                            element.setAttributeNS(null, attrName, newCol);
                        }
                    }
                }
            }
        });
        opacityEl.style.cursor = "pointer";
        opacityEl.style.border = "1px solid var(--color-border)";
        opacityEl.style.textAlign = "center";
        opacityEl.style.padding = "5px";
        if (opacities[varName].value > 0) {
            opacityEl.style.background = "var(--color-selected)";
        }
        opacityEl.style.fontWeight = "bold";
        opacityEl.style.letterSpacing = "2px";
        opacitiesContainer.appendChild(opacityEl);
    }
    const filtersContainer = addDiv(inputContainer);
    filtersContainer.style.display = "flex";
    filtersContainer.style.flexDirection = "row";
    filtersContainer.style.flexWrap = "wrap";
    const slidersContainer = addDiv(inputContainer);
    slidersContainer.style.marginBottom = "5px";
    const defaultPlotSizes = {
        plotHeight: 600,
        widthPerElement: 100,
        axisPadLeft: 120,
        axisPadBottom: 250,
        axisPadTop: 20,
        dataPadX: 50,
        dataPadY: 10,
        tickLength: 5,
        prePostDistance: 40,
        boxPlotWidth: 15,
        svgTextLineHeightGuess: 20,
    };
    // NOTE(sen) Dev only for now
    fetch("/vis2022.csv")
        .then((resp) => resp.text())
        .then((string) => updateData(string, opacities, colors, defaultPlotSizes, plotContainers, slidersContainer, filtersContainer))
        .catch(console.error);
};
main();
export {};
//# sourceMappingURL=titre-visualizer.js.map