
var margin = 5, legend_margin = 200, text_margin = 15;
var draw = SVG('papers').size(width, height);
    // draw.rect(width, height).fill("#fff").dblclick(function() { zoom_out() });
    draw.rect(width, height).fill("transparent").dblclick(function() { zoom_out() });
    draw.viewbox(0,0,width,height);
// this decides layer order
var draw_edge = draw.group();
var draw_node = draw.group();
var draw_text = draw.group();
var draw_legend = draw.group();

var nsize = 5, nsizeb = 8;
var bbox = [width,-width,height,-height,0,0]; // (x_min, x_max, y_min, y_max, x_center, y_center)
var colors = ["#065143", "#4363d8",
  "#FCAB10", "#ff9234", "#e6194B",
  "#0b409c", "#5e227f", "#caabd8", "#ff6bd6", ]
var glist = [], dlist = [];
var group_flag = {};
var every_nodes = {};
var every_nodes_t = {};
var every_edges = {};
var legend_rect = {};
var legend_text = {};
var zoomed = false;

function drawCloud( data ) {
  var docs = new Set();
  var groups = new Set();
  for (var key in data) {
    // calculating boundary box
    bbox[0] = Math.min(bbox[0], data[key][0]-margin)
    bbox[1] = Math.max(bbox[1], data[key][0]+margin)
    bbox[2] = Math.min(bbox[2], data[key][1]-margin)
    bbox[3] = Math.max(bbox[3], data[key][1]+margin)
    // save names of nodes
    var name = key.split("_");
    var gname = name[0]+"_"+name[1];
    var seq = name[2];
    docs.add(name[0]);
    groups.add(gname);
    group_flag[gname] = true;
    every_nodes[gname] = [];
    every_nodes_t[gname] = [];
    every_edges[gname] = [];
  }
  bbox[4] = (bbox[0]+bbox[1])/2;
  bbox[5] = (bbox[2]+bbox[3])/2;

  dlist = Array.from(docs); // list of names
  glist = Array.from(groups)
  var xd = bbox[1]-bbox[0],
      yd = bbox[3]-bbox[2];
  var xs = (width-legend_margin)/xd, ys = height/yd;
  // console.log("original", xd, yd, xs, ys);
  // draw circle for each point
  for (var key in data) {
    var name = key.split("_");
    var gname = name[0]+"_"+name[1];
    var seq = name[2];
    var newx = (data[key][0]-bbox[4])*xs+(width-legend_margin)/2,
        newy = (data[key][1]-bbox[5])*ys+height/2;
    // console.log(data[key][0], data[key][1], newx, newy);
    var circle = draw_node.circle(nsize*2).id(key)
        .attr("ox", data[key][0]).attr("oy", data[key][1])
        .attr("px", newx).attr("py", newy)
        .center(newx, newy)
        .fill(colors[dlist.indexOf(name[0])%colors.length]);
    every_nodes[gname].push(circle);
  }

  // text for each point
  for (var key in data) {
    var name = key.split("_");
    var gname = name[0]+"_"+name[1];
    var seq = name[2];
    var newx = (data[key][0]-bbox[4])*xs+(width-legend_margin)/2,
        newy = (data[key][1]-bbox[5])*ys+height/2;
    var label = seq;
    var c_text = draw_text.text(label).id(key).fill("#000")
        .attr("x", newx+text_margin).attr("y", newy)
        .attr("stroke", 1)
        .attr("stroke-color", "white")
        .attr("visibility", "hidden");
    every_nodes_t[gname].push(c_text);
  }

  // draw legends
  for (var gid in glist) {
    gname = glist[gid];
    docid = gname.split("_")[0]
    legend_rect[gname] = draw_legend.rect(20,20).id(gid)
        .stroke(colors[dlist.indexOf(docid)%colors.length])
        .fill(colors[dlist.indexOf(docid)%colors.length]).move(width-legend_margin, gid*25+20);
    legend_text[gname] = draw_legend.text(glist[gid]).id(gid)
        .move(width-legend_margin+30, gid*25+20)
        .fill("#000");

    legend_rect[gname].click(function() { toggle_group(this.node.id) });
    legend_rect[gname].mouseover(function() { highlight_group(glist[this.node.id]) });
    legend_text[gname].mouseover(function() { highlight_group(glist[this.node.id]) });
    legend_rect[gname].mouseout(function() { reset_highlight() });
    legend_text[gname].mouseout(function() { reset_highlight() });
  }

}

var mouse = {
    x: 0,
    y: 0,
    startX: 0,
    startY: 0
};
var element = null;
function hover_change() {
  console.log("hover_switch", hover_switch.checked);
  var rects = document.getElementsByClassName("select_rectangle")
  while (rects.length > 0) {
    rects[0].remove();
    verbose_text.innerHTML = 0;
  }
}

function enableRectDraw() {
  canvas.onmousemove = function(e) { draw_rect_move(e); };
  canvas.onclick = function(e) { draw_rect_click (e); };
}

function setMousePosition(e) {
  var ev = e || window.event; //Moz || IE
  if (ev.pageX) { //Moz
      mouse.x = ev.pageX + window.pageXOffset;
      mouse.y = ev.pageY + window.pageYOffset;
  } else if (ev.clientX) { //IE
      mouse.x = ev.clientX + document.body.scrollLeft;
      mouse.y = ev.clientY + document.body.scrollTop;
  }
}

function get_papers_in_rect(element){
  var sl = element.style.left,
      sw = element.style.width,
      st = element.style.top,
      sh = element.style.height;
  var pl = parseInt(sl.substring(0, sl.length-2)),
      pr = pl+parseInt(sw.substring(0, sw.length-2)),
      pt = parseInt(st.substring(0, st.length-2)),
      pb = pt+parseInt(sh.substring(0, sh.length-2));
  // console.log("rect", pl, pr, pt, pb);
  var selectedcircles = [];
  var everycircles = $("circle");
  // console.log("everycircles.length", everycircles.length)
  for (var c = 0; c < everycircles.length; c++) {
    var gname = everycircles[c].getAttribute("id").split("_")[0];
    if (group_flag[gname]
      && (pl <= everycircles[c].getAttribute("cx") && everycircles[c].getAttribute("cx") <= pr)
      && (pt <= everycircles[c].getAttribute("cy") && everycircles[c].getAttribute("cy") <= pb)) {
      // console.log(everycircles[c].getAttribute("id"));
      selectedcircles.push(everycircles[c].getAttribute("id"));
    }
  }
  // console.log(selectedcircles);
  return selectedcircles;
}

function print_selected(data) {
  $.ajax({
    type: "POST",
    url: "/search",
    data: {
      "summary": false,
      "nodes": JSON.stringify(data)
    },
    success: function (result) {
      // console.log("success", result["text"]);
      verbose_text.innerHTML += result["text"];
      verbose_text.scrollTop = verbose_text.scrollHeight;
    },
    error: function (result) {
      console.log("error");
    }
  });
}


function draw_rect_move(e) {
  if (hover_switch && !hover_switch.checked) return;
  setMousePosition(e);
  if (element !== null) {
      element.style.width = Math.abs(mouse.x - mouse.startX) + 'px';
      element.style.height = Math.abs(mouse.y - mouse.startY) + 'px';
      element.style.left = (mouse.x - mouse.startX < 0) ? mouse.x + 'px' : mouse.startX + 'px';
      element.style.top = (mouse.y - mouse.startY < 0) ? mouse.y + 'px' : mouse.startY + 'px';
  }
}
function draw_rect_click(e) {
  if (hover_switch && !hover_switch.checked) return;
  if (element !== null) {
      print_selected(get_papers_in_rect(element));
      element = null;
      canvas.style.cursor = "default";
      console.log("finsihed.");
  } else {
      console.log("begun.");
      mouse.startX = mouse.x;
      mouse.startY = mouse.y;
      element = document.createElement('div');
      element.className = 'select_rectangle'
      element.style.left = mouse.x + 'px';
      element.style.top = mouse.y + 'px';
      canvas.appendChild(element)
      canvas.style.cursor = "crosshair";
  }
}

function save_as_file(filename){
  // download as svg file
  var svgData = $("#papers")[0].outerHTML;
  var svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
  var svgUrl = URL.createObjectURL(svgBlob);
  var downloadLink = document.createElement("a");
  downloadLink.href = svgUrl;
  downloadLink.download = filename+".png";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

function zoom_out() {
  if (!zoomed || (hover_switch && hover_switch.checked)) return;
  zoomed = false;
  reset_highlight();
  remove_edges();
  draw.animate(100).viewbox(0, 0, width, height);
}

function calculate_bbox(data) {
  var box = [width,-width,height,-height,0,0];
  for (var key in data) {
    // calculating boundary box
    box[0] = Math.min(box[0], data[key].node.getAttribute("px"));
    box[1] = Math.max(box[1], data[key].node.getAttribute("px"));
    box[2] = Math.min(box[2], data[key].node.getAttribute("py"));
    box[3] = Math.max(box[3], data[key].node.getAttribute("py"));
  }
  // console.log("calculate_canvas", box);
  box[4] = (box[0]+box[1])/2;
  box[5] = (box[2]+box[3])/2;
  return box
}


var mouseover_while_zoomed;
function highlight_node(nid) {
  if (hover_switch && hover_switch.checked) return;
  // console.log("highlight_node", nid);
  if (!zoomed) dim_every_nodes(0.6);
  mouseover_while_zoomed = nid;
  var members = SVG.select("#"+nid).members;
  for (var n in members) {
    if (members[n].type == "circle") { members[n].attr("r", nsizeb).attr("opacity", 1); }
    if (members[n].type == "text") { members[n].text(nid).attr("visibility", "visible"); }
  }
}

function remove_edges() {
  for (var gname in every_nodes) {
    for (var e in every_edges[gname]) {
      every_edges[gname][e].remove();
    }
  }
}

function toggle_group(gid) {
  if (zoomed) return;
  gname = glist[gid];
  docid = gname.split("_")[0]
  group_flag[gname] = !group_flag[gname];
  console.log("set group flag", gname, group_flag[gname])
  for (var e in every_nodes[gname]) {
    if (group_flag[gname]) {
      legend_rect[gname].fill(colors[dlist.indexOf(docid)%colors.length]);
      every_nodes[gname][e].attr("visibility", "visible");
      every_nodes_t[gname][e].attr("visibility", "visible");
    } else {
      legend_rect[gname].fill("#eee");
      every_nodes[gname][e].attr("visibility", "hidden");
      every_nodes_t[gname][e].attr("visibility", "hidden");
    }
  }
}

function highlight_group(gname) {
  if (zoomed || !group_flag[gname] || (hover_switch && hover_switch.checked)) return;
  // console.log("highlight_group", gname);
  dim_every_nodes(0.3);
  docid = gname.split("_")[0]
  for (var e in every_nodes[gname]) {
    every_nodes[gname][e].attr("r", nsizeb).attr("opacity", 1)
        .fill(colors[dlist.indexOf(docid)%colors.length]);
    every_nodes_t[gname][e].attr("visibility", "visible");
  }
}

function dim_every_nodes(opct) {
  for (var gname in every_nodes) {
    for (var e in every_nodes[gname]) {
      every_nodes[gname][e].attr("opacity", opct);
    }
    for (var e in every_edges[gname]) {
      every_edges[gname][e].attr("opacity", opct);
    }
  }
}

function reset_highlight() {
  if (zoomed) {
    // console.log("mouseover_while_zoomed", mouseover_while_zoomed)
    var members = SVG.select("#"+mouseover_while_zoomed).members;
    for (var n in members) {
      if (members[n].type == "circle") { members[n].attr("r", nsize).attr("opacity", 0.6); }
      if (members[n].type == "text") { members[n].text(mouseover_while_zoomed).attr("visibility", "hidden"); }
    }
    return;
  }
  for (var gname in every_nodes) {
    docid = gname.split("_")[0]
    for (var e in every_nodes[gname]) {
      var tmp = every_nodes[gname][e].node;
      var newx = tmp.getAttribute("px"), newy = tmp.getAttribute("py");
      every_nodes[gname][e].attr("r", nsize)
          .attr("cx", newx).attr("cy", newy)
          .attr("opacity", 1)
          .fill(colors[dlist.indexOf(docid)%colors.length]);
      var name = tmp.id.split("_");
      var label = name[2];
      every_nodes_t[gname][e].text(label).attr("visibility", "hidden")
          .attr("x", newx+text_margin).attr("y", newy)
    }
  }
}
