// Using Solub's voronoi sketch example as starting point
// https://editor.p5js.org/solub/sketches/zxOYxcpR_
// Uses d3 in order to generate voronoi visualization
// Organized code, modified to allow for gaussian distrib. point creation and expansion, in order to simulate active system.

// Logic (todo):
// X Define gaussian distro for initial locations.
// X Define gaussian distro for voronoi bounds derived from initial locations.
// - Create two sets of groups to control separately.
// - Dictate drawing based on size threshold.
// - Allow for expansion or contractoin of guassian deviation when running sketch.

p5.disableFriendlyErrors = true;

const NUMA = 40; // Number of cells
const NUMB = 40;
const NUMTOTAL = NUMA + NUMB;
const HALFPI = Math.PI*0.5
const RAND = (min, max) => Math.random() * (max - min) + min //d3.randomUniform

let W, H, polygons, voronoi, positions, originalPositions, velocities, colors;

let initialPosFactory = (xInit, yInit, spreadInit) => {
  return (_, i) => randomGaussian(i & 1 ? yInit : yInit, spreadInit);
}
//let initialPositionFunction = (_, i) => randomGaussian(i & 1 ? H / 2 : W / 2, 10);
let mvmtBoundFunctions = {
      x: xPos => xPos >= oPos[0] + 100 || xPos <= oPos[0] - 100 || xPos >= W-4 || xPos <= 4,
      y: yPos => yPos >= oPos[1] + 100 || yPos <= oPos[1] - 100 || yPos >= H-4 || yPos <= 4
}

function setup() {
  ctx = canvas.getContext("2d");
  [W, H] = [windowWidth, windowHeight];
  createCanvas(W, H);
  //frameRate(1000);
  strokeWeight(4)
  fill('#fff')
  //noStroke()
  
  positionsA = cellPositions2(NUMA, W, H, initialPosFactory(H * .25, W * .25, 10));
  originalPositionsA = JSON.parse(JSON.stringify(positionsA));
  
  positionsB = cellPositions2(NUMB, W, H, initialPosFactory(H * .75, W * .75, 10));
  console.log(positionsB)
  originalPositionsB = JSON.parse(JSON.stringify(positionsB));
  
  // Assign random x/y velocities between -0.1 and 0.1
  velocitiesA = cellVelocities(NUMA); 
  velocitiesB = cellVelocities(NUMB); 
  
  // Create voronoi data
  voronoiA = d3.voronoi().extent([[0, 0],[W, H]]);
  voronoiB = d3.voronoi().extent([[0, 0],[W, H]]);
  
  // Colors
  colorsA = cellColors(NUMA);
  colorsB = cellColors(NUMB);
}


function draw() {
  //background('#666')
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  // Get polygon data
  polygons = voronoiA(positionsA.concat(positionsB)).polygons()
  //polygonsB = voronoiB(positionsB).polygons()
  // Iterate over cells and draw
  
  let rverts = [];
  let points = [];
  for (let i = 0; i < NUMA; i++) {    
    pos = positionsA[i]
    oPos = originalPositionsA[i];
    vel = velocitiesA[i]
    
    //let rverts = moveCell(i, pos, vel, polygonsA, mvmtBoundFunctions);
    
    rverts.push(moveCell(i, pos, vel, polygons, mvmtBoundFunctions));

    //renderCell(rverts, i, colorsB);
    
    // RENDER points (site)
    points.push([pos[0], pos[1]]);
    //point(pos[0], pos[1])
  
  }
  
    // Iterate over cells and draw
  for (let i = 0; i < NUMB; i++) {    
    pos = positionsB[i]
    oPos = originalPositionsB[i];
    vel = velocitiesB[i]
    
    rverts.push(moveCell(i + (NUMA - 0), pos, vel, polygons, mvmtBoundFunctions));

    //renderCell(rverts, i, colorsA);
    
    // RENDER points (site)
    points.push([pos[0], pos[1]]);
    //point(pos[0], pos[1])
  
  }
  for (let i = 0; i < NUMTOTAL; i++) {
    renderCell(rverts[i], i, colorsA.concat(colorsB));
    point(points[i][0], points[i][1]);
  }

  
  // FrameRate Debug
  // text(frameRate(), 20, 20);

}

function renderCell(verts, index, cols) {
    // RENDER (cell)
    push()
    fill(cols[index])
    noStroke()
    beginShape();
    verts.map(v => vertex(v.x, v.y));
    endShape(CLOSE);
    pop()
}

function moveCell(cellIndex, cellPosition, cellVelocity, polys, bounds={}) {
  let boundFns = {
    x: (p) => p >= W-4 || p <= 4,
    y: (p) => p >= H-4 || p <= 4
  }
  bounds = Object.assign(boundFns, bounds);
        
  // EULER
  // these are global vars for some reason
  pos = cellPosition
  vel = cellVelocity
  vel[0] += RAND(-0.1, 0.1)
  vel[1] += RAND(-0.1, 0.1)
  pos[0] += vel[0]
  pos[1] += vel[1]
  vel[0] *= 0.99
  vel[1] *= 0.99

  // WALLS - flip velocity
  if (bounds.x(pos[0])) vel[0] *= -1 
  if (bounds.y(pos[1])) vel[1] *= -1


  // ALGO
  vertices = polys[cellIndex].map(v => createVector(v[0], v[1]));
  rverts = roundCorners(vertices, 15);

  return rverts;
}

// Optionally pass in a fn to dictate cell position creation.
// Anon function must take two params, (_, i) where i is index (either 0 or 1);
function cellPositions2(numberOfCells, w, h, posFn=(_, i) => Math.random() * (i & 1 ? H : W)) {
  // Create range from numberOfCells
  let cells = Array.from({length: numberOfCells}, (_, i) => i);
  // Populate range
  return cells.map(_ => Array.from({length: 2}, posFn));
}

function cellVelocities(numberOfCells) {
  return d3.range(numberOfCells).map(_ => Float64Array.from({length: 2}, _ => RAND(-0.1, 0.1) )); 
}

function cellColors(numberOfCells) {
  return d3.range(numberOfCells).map(i => d3.interpolateGnBu(norm(i, 0, numberOfCells)))
}

