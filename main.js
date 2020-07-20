const MAX_NUM = 2100;
const N_NUMS = MAX_NUM + 1;

// Debouncing snippet from: https://gomakethings.com/debouncing-your-javascript-events/
/**
 * Debounce functions for better performance
 * (c) 2018 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {Function} fn The function to debounce
 */
var debounce = function (fn) {

	// Setup a timer
	var timeout;

	// Return a function to run debounced
	return function () {

		// Setup the arguments
		var context = this;
		var args = arguments;

		// If there's a timer, cancel it
		if (timeout) {
			window.cancelAnimationFrame(timeout);
		}

		// Setup the new requestAnimationFrame()
		timeout = window.requestAnimationFrame(function () {
			fn.apply(context, args);
		});

	}

};

// Get the offset for a row to index into a flattened upper triangular data
// matrix without the main diagonal.
function rowOffset(row) {
  return row * (MAX_NUM - (row - 1) / 2); // Off-diagonal "triangular numbers"
}

// Directly read similarities against the encoded & flattened data
function similarity(flatData, row, col) {
  if (row == col) { // Diagonal is known to be 1.0
    return 1.0;
  }
  if (col > row) {
      const idx = rowOffset(row) + col - row - 1;
      return Math.round(flatData[idx] * 100 / 255) / 100;
  }
  return similarity(flatData, col, row); // Symmetry
}

// Called on script load
async function main() {
  // Begin fetching the data asynchronously
  const fileBufferPromise = d3.buffer("upper-uint8-2100.dta", {cache: "force-cache"});

  // We'll draw the full-res image into a buffer and re-render from there on zoom
  // Not supported in Firefox :(
  // const offscreenCanvas = new OffscreenCanvas(N_NUMS, N_NUMS);
  const offscreenCanvas = d3.create("canvas")
    .attr("width", N_NUMS)
    .attr("height", N_NUMS)
    .node();
  const offscreenContext = offscreenCanvas.getContext("2d");
  offscreenContext.imageSmoothingEnabled = false;

  // Precompute all possible colors and their pixel encodings
  const colormap = d3.scaleSequential(d3.interpolatePlasma).domain([0, 255]);
  const colors = new Array(256);
  for (let i = 0; i < 256; i++) {
  const {r, g, b} = d3.color(colormap(i));
  colors[i] = (255 << 24) | // Alpha
               (b   << 16) | // Blue
               (g   <<  8) | // Green
                r;           // Red
  }

  // See: http://bl.ocks.org/biovisualize/5400576
  const imageData = offscreenContext.getImageData(0, 0, N_NUMS, N_NUMS);
  const buf = new ArrayBuffer(imageData.data.length);
  const buf8 = new Uint8ClampedArray(buf);
  const data = new Uint32Array(buf);

  // When the data is fetched, draw pixels into the offscreen buffer
  // (dangerous async global state stuff lol)
  const encodedDataPromise = fileBufferPromise.then(async loadedData => {
    const encoded = new Uint8Array(await fileBufferPromise);
    let rowElems = 0; // Running count equivalent to rowOffset(row)
    for (let row = 0; row < N_NUMS; row++) {
      for (let col = 0; col < N_NUMS; col++) {
        // Inline data-access code for efficiency
        const dataIdx = row * N_NUMS + col;
        if (row === col) { // Main diagonal is known to be 1
          data[dataIdx] = colors[255];
        } else if (col > row) {
          const idx = rowElems + col - row - 1;
          const value = encoded[idx];
          data[dataIdx] = colors[value];
        } else { // Symmetry
          data[dataIdx] = data[col * N_NUMS + row];
        }
      }
      rowElems += MAX_NUM - row;
    }
    imageData.data.set(buf8);
    offscreenContext.putImageData(imageData, 0, 0);
    return encoded;
  });

  // Get and configure basic objects
  const canvas = d3.select("#viz canvas");
  const context = canvas.node().getContext("2d");
  context.imageSmoothingEnabled = false;
  const svg = d3.select("#viz svg");

  const X_AXIS_SIZE = 60;
  const Y_AXIS_SIZE = 30;
  const MARGIN_SIZE = 75;
  const IMG_START_Y = Y_AXIS_SIZE + MARGIN_SIZE;

  // Pre-setup: X and Y margin axes
  const axisScale = d3.scaleLinear().domain([-0.5, MAX_NUM + 0.5]) // Pad to center tick inside the correct pixel
  let axisX;
  let axisY;
  let axisXGroup = svg.append("g")
    .attr("transform", "translate(" + X_AXIS_SIZE + "," + (MARGIN_SIZE + Y_AXIS_SIZE - 2) + ")");
  let axisYGroup = svg.append("g")
      .attr("transform", "translate(" + (X_AXIS_SIZE - 2) +"," + IMG_START_Y +")");

  // Create X and Y mouse text and tooltip
  const mouseXGroupSel = svg.append("g").attr("id", "#mouse-x");
  const mouseXGroup = mouseXGroupSel.node();
  mouseXGroupSel.append("rect")
    .attr("x", "-25px")
    .attr("y", "-20px")
    .attr("width", "50px")
    .attr("height", "22px")
    .attr("fill", "white");
  const mouseXText = mouseXGroupSel.append("text").attr("class", "mouse-loc").node();
  mouseXGroup.setAttribute("transform", "translate(-100, -100)");

  const mouseYGroupSel = svg.append("g").attr("id", "#mouse-y");
  const mouseYGroup = mouseYGroupSel.node();
  mouseYGroupSel.append("rect")
    .attr("x", "-25px")
    .attr("y", "-20px")
    .attr("width", "47px")
    .attr("height", "24px")
    .attr("fill", "white");
  const mouseYText = mouseYGroupSel.append("text").attr("class", "mouse-loc").node();
  mouseYGroup.setAttribute("transform", "translate(-100, -100)");

  const tooltipSel = svg.append("g");
  const tooltip = tooltipSel.node();
  tooltipSel.append("rect")
    .attr("x", "-5px")
    .attr("y", "-15px")
    .attr("width", "37px")
    .attr("height", "30px")
    .attr("fill", "#eceff1")
    .attr("stroke", "black")
    .attr("stroke-width", "1px")
    .attr("opacity", "85%");
  const tooltipText = tooltipSel.append("text")
    .attr("id", "tooltip-text")
    .attr("y", "5px")
    .node();
  tooltip.setAttribute("transform", "translate(-100, -100)");

  // Pre-setup: top marginal
  const marginValues = Array(N_NUMS);
  const topMarginX = d3.scaleLinear().domain([0, MAX_NUM]);
  const topMarginY = d3.scaleLinear()
    .domain([0, 1])
    .range([MARGIN_SIZE - 5, 5]);
  let clickCol = undefined;
  const clickLine = svg.select("#click-col").attr("opacity", "0%");

  // Draw initial marginal values on the baseline for a nice effect on first click
  const marginLines = svg.selectAll("line.marginal")
    .data(marginValues) // NOTE: undefined
    .enter()
    .append("line")
    .attr("class", "marginal")
    .attr("clip-path", "url(#marginal-clip)")
    .attr("y1", MARGIN_SIZE)
    .attr("y2", MARGIN_SIZE);
  const marginNodes = marginLines.nodes();
  let zoomSlow = 1;

  // X and Y "data scales" map canvas coordinates into data indices
  const dataAccessX = d3.scaleLinear();
  const dataAccessY = d3.scaleLinear();
  let leftEdge = 0;
  let rightEdge = MAX_NUM;
  let topEdge = 0;
  let bottomEdge = MAX_NUM;

  // Size-dependent elements must wait for CSS render, and must be re-run on resize.
  async function draw() {
    const IMG_SIZE = canvas.node().clientWidth;

    // Update margin background and clipping path
    svg.select("#margin-background").attr("width", IMG_SIZE);
    svg.select("clipPath rect").attr("width", IMG_SIZE);

    // Setup initial values that depend on scale
    axisScale.range([0, IMG_SIZE]);
    axisX = d3.axisTop(axisScale).ticks(6);
    axisY = d3.axisLeft(axisScale).ticks(6);
    topMarginX.range([X_AXIS_SIZE, X_AXIS_SIZE + IMG_SIZE]);
    marginLines
      .attr("x1", (_, i) => topMarginX(i))
      .attr("x2", (_, i) => topMarginX(i + 1));
    dataAccessX.domain([0, IMG_SIZE]);
    dataAccessY.domain([0, IMG_SIZE]);

    // Finally, we need the OffscreenCanvas to finish drawing
    const encodedData = await encodedDataPromise;

    // On click, re-bind the marginal data
    function updateMarginal(dataCol) {
      const initialClick = (clickCol === undefined);
      clickCol = dataCol;

      if (initialClick) {
        clickLine
          .attr("x1", topMarginX(clickCol + 0.5))
          .attr("x2", topMarginX(clickCol + 0.5))
          .transition().duration(250)
          .attr("opacity", "100%");
      }

      clickLine
        .transition("moveClickLine")
        .duration(250)
        .attr("x1", topMarginX(clickCol + 0.5))
        .attr("x2", topMarginX(clickCol + 0.5));

      d3.range(N_NUMS).map(i => marginValues[i] = similarity(encodedData, i, dataCol));
      d3.range(N_NUMS).map(i => marginValues[i] = similarity(encodedData, i, dataCol));
      marginLines
        .data(marginValues)
        .transition()
        .duration(250)
        .delay(function(_, i) {
          // Instantly transition offscreen elements
          if (i < leftEdge - 1 || i > rightEdge + 1) {
            return 0;
          }
          return (initialClick ? 0 : 250) + Math.abs(dataCol - i) * (zoomSlow / 3);
        })
        .attr("y1", d => topMarginY(d))
        .attr("y2", d => topMarginY(d));
    }
    canvas.on("click", function() {
      const [mouseX, _] = d3.mouse(this);
      const dataCol = dataAccessX(mouseX);
      updateMarginal(dataCol);
    });

    // Handle canvas mouseover
    let hoverRow = undefined;
    let hoverCol = undefined;
    let hoverMarginal = undefined;
    function onCanvasHover() {
      const [mouseX, mouseY] = d3.mouse(this);
      const dataRow = dataAccessY(mouseY);
      const dataCol = dataAccessX(mouseX);

      // Operate on raw DOM to avoid selection overhead
      mouseXGroup.setAttribute("transform", "translate(" + (mouseX + 60) + ", 97)");
      mouseXText.innerHTML = dataCol;

      mouseYGroup.setAttribute("transform", "translate(30, " + (mouseY + 110) + ")");
      mouseYText.innerHTML = dataRow;

      tooltip.setAttribute("transform", "translate(" + (mouseX + 46) + ", " + (mouseY + 86) + ")")
      tooltipText.innerHTML = Number.parseFloat(
        similarity(encodedData, dataRow, dataCol)
      ).toFixed(2);

      if (hoverMarginal) {
        hoverMarginal.classList.remove("hover");
      }
      hoverMarginal = marginNodes[dataCol];
      hoverMarginal.classList.add("hover");
    }
    function resetCanvasHover() {
      mouseXText.innerHTML = "";
      hoverRow = undefined;
      hoverCol = undefined;
      if (hoverMarginal) {
        hoverMarginal.classList.remove("hover");
        hoverMarginal = undefined;
      }

      // Move offscreen to avoid needing to update visibility in the hover fastloop
      mouseXGroup.setAttribute("transform", "translate(-100, -100)");
      mouseYGroup.setAttribute("transform", "translate(-100, -100)");
      tooltip.setAttribute("transform", "translate(-100, -100)");
    }
    canvas.on("mousemove", onCanvasHover);
    canvas.on("mouseout", resetCanvasHover);

    // Handle zooming, panning, and drawing the canvas, axes, and margin
    function onZoom() {
      const transform = d3.event.transform;
      zoomSlow = transform.k;

      // Redraw the canvas
      context.save();
      context.translate(transform.x * N_NUMS / IMG_SIZE, transform.y * N_NUMS / IMG_SIZE);
      context.scale(transform.k, transform.k);
      context.drawImage(offscreenCanvas, 0, 0, N_NUMS, N_NUMS);
      context.restore();

      // Rescale and redraw the axes
      // See: https://bl.ocks.org/mbostock/db6b4335bf1662b413e7968910104f0f/
      //      e59ab9526e02ec7827aa7420b0f02f9bcf960c7d
      axisXGroup.call(
        axisX.scale(
          transform.rescaleX(axisScale)));
      axisYGroup.call(
        axisY.scale(
          transform.rescaleY(axisScale)));

      // Compute the edges in data space
      leftEdge = -transform.x * N_NUMS / (transform.k * IMG_SIZE);
      rightEdge = (-transform.x + IMG_SIZE) * N_NUMS / (transform.k * IMG_SIZE);
      topEdge = -transform.y * N_NUMS / (transform.k * IMG_SIZE);
      bottomEdge = (-transform.y + IMG_SIZE) * N_NUMS / (transform.k * IMG_SIZE);

      // Rescale data access scales to fit the transformed screen
      // Again, pad so the click locations overlap the pixels exactly
      dataAccessX.rangeRound([leftEdge - 0.5, rightEdge - 0.5]);
      dataAccessY.rangeRound([topEdge - 0.5, bottomEdge - 0.5]);

      // Update margin values
      topMarginX.domain([leftEdge, rightEdge]);
      marginLines
        .attr("x1", (_, i) => topMarginX(i))
        .attr("x2", (_, i) => topMarginX(i + 1));

      if (clickCol) {
        clickLine
          .attr("x1", topMarginX(clickCol + 0.5))
          .attr("x2", topMarginX(clickCol + 0.5));
      }
    }
    const zoom = d3.zoom()
      .scaleExtent([1, 300])
      .translateExtent([[0, 0], [IMG_SIZE, IMG_SIZE]])
      .on("zoom", onZoom)
    canvas.call(zoom);
    canvas.call(zoom.transform, d3.zoomIdentity); // Initial zoom
  }

  // Draw once on load, and redraw (debounced) on resize
  window.onload = draw;
  window.onresize = debounce(draw);
}

main();
