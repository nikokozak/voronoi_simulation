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

// Logic (idea):
// - Two (or more) sets of positions & velocities along with backups (for bound tracking).
// - For each set, we can define an origin??
// - For each set, we can define bounding functions to keep them from moving too far.
// - For each set, we can define velocities (random or vectors).
// - Positions are then unified and fed into Voronoi system.
// - Voronoi system is drawn, along with filters for size/etc.
/*
  NOTE - I like to code in a functional style, which is why this might look a bit rote.

  This might look like:
  [{
    positions: [],
    velocities: [],
    _positions: [], // where positions remains static. (or maybe we redraw)
    _velocities: [] // where velocities is updated on a per-draw cycle.
  }, {...}]

  Where the elements are:
  CellSystem -> A group of CellBody(s)
  CellBody -> A group of Cell(s)

  So potentially this looks like:
  
  makeCellSystem(numCellGroups, cellsPerGroup = 40) {
    let cellSystem = Array.from({length: numCellGroups}, (_) => {}];
    makeCellSystemPositions(cellSystem);
    makeCellSystemVelocities(cellSystem);
    return cellSystem;
  }

  makeCellSystemPositions(cellSystem, cellsPerGroup) {
    for (let i = 0; i < cellSystem.length; i++) {
      makeCellBodyPositions(cellSystem[i], cellsPerGroup);
    }
    return cellSystem;
  }

  makeCellBodyPositions(cellBody, cellsPerGroup, initialCoords, initialSpread) {
    cellBody.positions = [];
    cellBody._positions = [];
    for (let i = 0; i < cellsPerGroup; i++) {
      let position = Array.from({length: 2}, (_, i) => {
          randomGaussian(i & 1 ? intialCoords.y : initialCoords.x, initialSpread);
        });

      cellBody.positions.push(position);
      cellBody._positions.push(position);
    }
  }
  
  makeCellBodyVelocities(cellBody, cellsPerGroup) {
    cellBody.velocities = [];
    cellBody._velocities = [];
    for (let i = 0; i < cellsPerGroup; i++) {
      let velocity = Array.from({length: 2}, (_, _) => {
          RAND(-0.1, 0.1);
        }
      
      cellBody.velocities.push(velocity);
      cellBody._velocities.push(velocity);
    }
  }

  Then, we need to start interfacing these with the Voronoi system, which might look like:

  let voronoiSystem = makeVoronoiSystem(extents);

  function makeVoronoiSystem(extents = [[0, 0], [W, H]]) {
    return d3.voronoi.extent(extents[0], extents[1]); 
  }

  let voronoiPolygons = getVoronoiPolygons(VoronoiSystem, CellSystem);

  function getVoronoiPolygons(VoronoiSystem, cellSystem) {
    let positions = [];
    cellSystem.forEach(cellBody => {
        positions.concat(cellBody.positions);
    });
    return VoronoiSystem(positions).polygons();
  }

  function getVoronoiVertices(VoronoiPolygons, CellSystem) {
    let cellQty = CellSystem.reduce((accum, curr) => accum + curr.positions.length, 0);
    let vertices = [];

    for (let i = 0; i < cellQty, i++) {
      let vertices = VoronoiPolygons[i].map(v => createVector(v[0], v[1]));
      let rounded = roundCorners(vertices, 15);
      vertices.push(rounded);
    }
  }

  The Voronoi polygons are necessary so that we can eventually grab their vertices and draw 
  them out.

  In the meantime, we also have to "move" each Cell in our CellBody (i.e. "tick" each draw cycle)

  This might look like:

  tickCellBodySystem(cellBodySystem);

  function tickCellBodySystem(cellBodySystem) {
    cellBodySystem.forEach(cellBody => {
      tickCellBody(cellBody);
    });
  }

  function tickCellBody(cellBody) {
    for (let i = 0; i < cellBody.length; i++) {
      let cellPosition = cellBody.positions[i];
      let cellVelocity = cellBody.velocity[i];

      cellBody._velocity[i] = cellBody.velocity[i];
      [cellBody.positions[i], cellBody.velocity[i]] = tickCell(cellPosition, cellVelocity);
    }
  }

  tickCell(cellPosition, cellVelocity) {
    // EULER
    cellVelocity[0] += RAND(-0.1, 0.1)
    cellVelocity[1] += RAND(-0.1, 0.1)
    cellPosition[0] += cellVelocity[0]
    cellPosition[1] += cellVelocity[1]
    cellVelocity[0] *= 0.99
    cellVelocity[1] *= 0.99

    constrainCell(cellPosition, cellVelocity);
    return [cellPosition, cellVelocity];
  }

  function constrainCell(cellPosition, cellVelocity) {
    // Flip velocity
    if (cellPosition[0] >= W-4 || p <= 4) cellVelocity[0] *= -1 
    if (cellPosition[1] >= H-4 || p <= 4) cellVelocity[1] *= -1
  }

*/
p5.disableFriendlyErrors = true; // Better Debug

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

