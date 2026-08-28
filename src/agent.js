'use strict';

function createBoid() {
  return {
    position: new Vector2(Math.random() * world.width, Math.random() * world.height),
    velocity: Vector2.fromAngle(Math.random() * Math.PI * 2).times(params.maxSpeed),
    acceleration: Vector2.ZERO,
  };
}

function steeringToward(desiredDirection, currentVelocity) {
  if (desiredDirection.isZero) return Vector2.ZERO;

  return desiredDirection
    .scaledTo(params.maxSpeed)
    .minus(currentVelocity)
    .clampedTo(params.maxTurnForce);
}

function averageVelocityOf(neighbours) {
  return neighbours
    .reduce((total, neighbour) => total.plus(neighbour.other.velocity), Vector2.ZERO)
    .dividedBy(neighbours.length);
}

function averageOffsetTo(neighbours) {
  return neighbours
    .reduce((total, neighbour) => total.plus(neighbour.offset), Vector2.ZERO)
    .dividedBy(neighbours.length);
}

function isCrowding(neighbour) {
  const personalSpace = params.separationRadius * params.separationRadius;
  return neighbour.distanceSquared > 0 && neighbour.distanceSquared <= personalSpace;
}

function pushAwayFrom(neighbour) {
  return neighbour.offset.negated().dividedBy(neighbour.distanceSquared);
}

function combinedPushFromCrowding(neighbours) {
  return neighbours
    .filter(isCrowding)
    .reduce((total, neighbour) => total.plus(pushAwayFrom(neighbour)), Vector2.ZERO);
}

function alignmentForce(boid, neighbours) {
  return steeringToward(averageVelocityOf(neighbours), boid.velocity);
}

function cohesionForce(boid, neighbours) {
  return steeringToward(averageOffsetTo(neighbours), boid.velocity);
}

function separationForce(boid, neighbours) {
  return steeringToward(combinedPushFromCrowding(neighbours), boid.velocity);
}

function flockingForce(boid, neighbours) {
  return alignmentForce(boid, neighbours).times(params.alignmentWeight)
    .plus(cohesionForce(boid, neighbours).times(params.cohesionWeight))
    .plus(separationForce(boid, neighbours).times(params.separationWeight));
}

function advance(boid, seconds) {
  boid.velocity = boid.velocity
    .plus(boid.acceleration.times(seconds))
    .clampedTo(params.maxSpeed);

  boid.position = wrappedIntoWorld(boid.position.plus(boid.velocity.times(seconds)));
  boid.acceleration = Vector2.ZERO;
}
