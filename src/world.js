'use strict';

const MIN_GRID_CELLS = 3;

const world = {
  width: 0,
  height: 0,
  prey: [],
  predators: [],
  preyGrid: null,
};

function clampedIndex(index, count) {
  return Math.min(count - 1, Math.max(0, index));
}

function wrappedIndex(index, count) {
  return (index + count) % count;
}

class SpatialGrid {
  constructor(population, cellSize, width, height) {
    this.width = width;
    this.height = height;
    this.columns = Math.max(MIN_GRID_CELLS, Math.floor(width / cellSize));
    this.rows = Math.max(MIN_GRID_CELLS, Math.floor(height / cellSize));
    this.cells = Array.from({ length: this.columns * this.rows }, () => []);

    for (const boid of population) this.cellAt(boid.position).push(boid);
  }

  columnOf(x) {
    return clampedIndex(Math.floor((x / this.width) * this.columns), this.columns);
  }

  rowOf(y) {
    return clampedIndex(Math.floor((y / this.height) * this.rows), this.rows);
  }

  cellAt(position) {
    return this.cells[this.rowOf(position.y) * this.columns + this.columnOf(position.x)];
  }

  *withinOneCellOf(position) {
    const column = this.columnOf(position.x);
    const row = this.rowOf(position.y);

    for (let rowStep = -1; rowStep <= 1; rowStep++) {
      for (let columnStep = -1; columnStep <= 1; columnStep++) {
        const neighbourRow = wrappedIndex(row + rowStep, this.rows);
        const neighbourColumn = wrappedIndex(column + columnStep, this.columns);
        yield* this.cells[neighbourRow * this.columns + neighbourColumn];
      }
    }
  }
}

function wrappedAcrossAxis(value, axisLength) {
  const offscreen = BOID_SIZE;
  if (value < -offscreen) return axisLength + offscreen;
  if (value > axisLength + offscreen) return -offscreen;
  return value;
}

function wrappedIntoWorld(position) {
  return new Vector2(
    wrappedAcrossAxis(position.x, world.width),
    wrappedAcrossAxis(position.y, world.height),
  );
}

function shortestSpanAcrossAxis(gap, axisLength) {
  if (gap > axisLength / 2) return gap - axisLength;
  if (gap < -axisLength / 2) return gap + axisLength;
  return gap;
}

function shortestOffset(from, to) {
  return new Vector2(
    shortestSpanAcrossAxis(to.x - from.x, world.width),
    shortestSpanAcrossAxis(to.y - from.y, world.height),
  );
}

function neighboursOf(boid, grid) {
  const inSight = params.perceptionRadius * params.perceptionRadius;
  const neighbours = [];

  for (const other of grid.withinOneCellOf(boid.position)) {
    if (other === boid) continue;

    const offset = shortestOffset(boid.position, other.position);
    const distanceSquared = offset.lengthSquared;
    if (distanceSquared > inSight) continue;

    neighbours.push({ other, offset, distanceSquared });
  }

  return neighbours;
}

function nearestBoid(point, population) {
  let nearest = null;
  let nearestDistanceSquared = Infinity;

  for (const boid of population) {
    const distanceSquared = shortestOffset(point, boid.position).lengthSquared;
    if (distanceSquared < nearestDistanceSquared) {
      nearestDistanceSquared = distanceSquared;
      nearest = boid;
    }
  }

  return nearest;
}

function resizePopulation(population, target) {
  while (population.length > target) population.pop();
  while (population.length < target) population.push(createBoid());
}

function rebuildPreyGrid() {
  world.preyGrid = new SpatialGrid(world.prey, params.perceptionRadius, world.width, world.height);
}

function update(seconds) {
  rebuildPreyGrid();

  const forces = world.prey.map(boid => flockingForce(boid, neighboursOf(boid, world.preyGrid)));

  world.prey.forEach((boid, index) => { boid.acceleration = forces[index]; });
  world.prey.forEach(boid => advance(boid, seconds));
  world.predators.forEach(boid => advance(boid, seconds));
}
