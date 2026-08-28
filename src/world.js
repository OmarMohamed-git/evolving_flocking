'use strict';

const world = {
  width: 0,
  height: 0,
  prey: [],
  predators: [],
};

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

function neighboursOf(boid, population) {
  const inSight = params.perceptionRadius * params.perceptionRadius;
  const neighbours = [];

  for (const other of population) {
    if (other === boid) continue;

    const offset = shortestOffset(boid.position, other.position);
    if (offset.lengthSquared > inSight) continue;

    neighbours.push({ other, offset, distanceSquared: offset.lengthSquared });
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

function update(seconds) {
  const forces = world.prey.map(boid => flockingForce(boid, neighboursOf(boid, world.prey)));

  world.prey.forEach((boid, index) => { boid.acceleration = forces[index]; });
  world.prey.forEach(boid => advance(boid, seconds));
  world.predators.forEach(boid => advance(boid, seconds));
}
