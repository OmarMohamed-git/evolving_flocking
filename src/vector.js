'use strict';

class Vector2 {
  static ZERO = new Vector2(0, 0);

  static fromAngle(radians) {
    return new Vector2(Math.cos(radians), Math.sin(radians));
  }

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  get lengthSquared() {
    return this.x * this.x + this.y * this.y;
  }

  get length() {
    return Math.sqrt(this.lengthSquared);
  }

  get angle() {
    return Math.atan2(this.y, this.x);
  }

  get isZero() {
    return this.x === 0 && this.y === 0;
  }

  plus(other) {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  minus(other) {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  times(factor) {
    return new Vector2(this.x * factor, this.y * factor);
  }

  dividedBy(divisor) {
    return divisor === 0 ? Vector2.ZERO : new Vector2(this.x / divisor, this.y / divisor);
  }

  negated() {
    return new Vector2(-this.x, -this.y);
  }

  normalised() {
    return this.dividedBy(this.length);
  }

  scaledTo(newLength) {
    return this.normalised().times(newLength);
  }

  clampedTo(maxLength) {
    return this.lengthSquared > maxLength * maxLength ? this.scaledTo(maxLength) : this;
  }
}
