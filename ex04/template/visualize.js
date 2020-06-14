// `data` contains the source code of the d3-force project.
console.table(data);

const BOX_PAD = 8;
const LINE_HEIGHT = 5.5;
const LINE_VERTICAL_PAD = 0.5;
const LINE_HORIZONTAL_PAD = 4;
const CAPTION_HEIGHT = 16;
const INDENTATION_WIDTH = 3;
const MAX_LINE_WIDTH = 120;
const BOX_VERTICAL_OFFSET = 100;
const TEXT_VERTICAL_OFFSET = 50;

/* Indentations */

function calcIndentation(line) {
  const pattern = /^\s*/;
  return line.match(pattern)[0].length;
}
const line_indentations = data
  .flatMap((file) => file.lines)
  .map((line) => calcIndentation(line));

/* Scalings and domain mappings */

const line_lengths = data
  .flatMap((file) => file.lines)
  .map((line) => line.length);

const width_domain = d3
  .scaleLinear()
  .domain([d3.min(line_lengths), d3.max(line_lengths)])
  .range([2, MAX_LINE_WIDTH]);

function calcComplexity(str) {
  const re = /[\[\]\{\}\(\)]/g;
  return ((str || "").match(re) || []).length; // number of occurences of {re} in {str}
}

const line_complexities = data
  .flatMap((file) => file.lines)
  .map((line) => calcComplexity(line));

const complexity_domain = d3
  .scaleSequential()
  .domain([-d3.max(line_complexities) / 3, d3.max(line_complexities)])
  .interpolator(d3.interpolateYlGn);
// negative start value / 3 used to not use the whole scale of interpolation, as lines are to light there.

/* svg element calculations */

function calcBoxHeight(data) {
  const line_height =
    (LINE_HEIGHT + LINE_VERTICAL_PAD) * data.lines.length + LINE_VERTICAL_PAD;
  // 4 lines means 5 paddings -> n lines means n+1 pads -> + LINE_VERTICAL_PAD
  return line_height;
}

function calcBoxX(data, i) {
  const previousElements = data.slice(0, i);
  return (
    previousElements.reduce(
      (accumulator, element) => accumulator + element.width + BOX_PAD,
      0
    ) + BOX_PAD
  );
}

function calcBoxWidth(data) {
  const line_width_with_indentation = data.lines.map(
    (line) => calcIndentation(line) * INDENTATION_WIDTH + lineWidth(line)
  );
  return Math.max(
    80,
    2 * LINE_HORIZONTAL_PAD + d3.max(line_width_with_indentation)
  );
}

function calcLineX(data, i) {
  const boxX = data.box_x_pos;
  const indentation = calcIndentation(data);
  return boxX + LINE_HORIZONTAL_PAD + indentation * INDENTATION_WIDTH;
}

function calcLineY(data, i) {
  return (
    BOX_VERTICAL_OFFSET +
    LINE_VERTICAL_PAD +
    i * (LINE_VERTICAL_PAD + LINE_HEIGHT)
  );
}

function lineWidth(data) {
  return width_domain(data.length);
}

function lineColor(data) {
  return complexity_domain(calcComplexity(data));
}

let enriched_data = data
  .map((file) => Object.assign(file, { width: calcBoxWidth(file) })) // add width
  .map((file, i) => Object.assign(file, { x_pos: calcBoxX(data, i) })); // add x_pos, second map needed because width is needed for calc of x_pos

const svg = d3.select("svg");
const filebox = svg
  .selectAll("rect.filebox")
  .data(enriched_data)
  .enter()

  .append("g")
  .attr("class", "filebox");
filebox
  .append("rect")
  .attr("x", function (d) {
    return d.x_pos;
  })
  .attr("y", BOX_VERTICAL_OFFSET)
  .attr("height", calcBoxHeight)
  .attr("width", function (d) {
    return d.width;
  });

filebox
  .append("text")
  .text(function (d) {
    return d.filename;
  })
  .attr("x", function (d) {
    return d.x_pos + LINE_HORIZONTAL_PAD;
  })
  .attr("y", TEXT_VERTICAL_OFFSET + CAPTION_HEIGHT);

filebox
  .append("text")
  .text(function (d) {
    return d.lines.length + " lines";
  })
  .attr("x", function (d) {
    return d.x_pos + LINE_HORIZONTAL_PAD;
  })
  .attr("y", TEXT_VERTICAL_OFFSET + CAPTION_HEIGHT * 2);

const div = d3
  .select("body")
  .append("div")
  .attr("class", "lens")
  .attr("readonly", true)
  .attr("wrap", "off")
  .style("opacity", 0);

svg
  .selectAll("g.lines")
  .data(data)
  .enter()
  .append("g")
  .attr("class", "lines")
  .selectAll("rect.line")
  .data(function (d, i) {
    return d.lines.map((line) =>
      Object.assign(line, { box_x_pos: d.x_pos, box_index: i })
    );
  })
  .enter()
  .append("rect")
  .attr("class", "line")
  .attr("width", lineWidth)
  .attr("x", calcLineX)
  .attr("y", calcLineY)
  .attr("height", LINE_HEIGHT)
  .attr("fill", lineColor)
  .on("mouseover", function (d, i) {
    let lines_to_show = enriched_data[d.box_index].lines;
    lines_to_show = lines_to_show.slice(
      Math.max(0, i - 2),
      Math.min(i + 3, lines_to_show.length)
    );
    const max_line_length = d3.max(lines_to_show.map((line) => line.length));
    console.log(lines_to_show, max_line_length);
    const text = lines_to_show.reduce((acc, el) => acc + el + "\n", "");
    div.transition().duration(200).style("opacity", 0.97);
    div
      .html(`<pre><code language="js">${text}</code></pre>`)
      .style("left", d3.event.pageX + 30 + "px")
      .style("top", d3.event.pageY - 120 + "px");
    document.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightBlock(block);
    });
  })
  .on("mouseout", function (d) {
    div.transition().duration(500).style("opacity", 0);
  });
