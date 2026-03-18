/**
 * @module 2dTypes
 * A container
 */

/** An object w/ a numeric x & y property. */
interface IPoint2d {
  x: number;
  y: number;
}
enum Axis2d { x, y }

class Direction2d implements IPoint2d {
  public static readonly up = new Direction2d(0, -1);
  public static readonly down = new Direction2d(0, 1);
  public static readonly left = new Direction2d(-1, 0);
  public static readonly right = new Direction2d(1, 0);
  public static readonly directions = Object.freeze([this.up, this.down, this.left, this.right]);
  private constructor(
    public readonly x: number,
    public readonly y: number,
  ) { Object.freeze(this); }

  public get opposite() { return Direction2d.fromParameters(Point2d.scale(this, -1))!; }
  public get asPoint() { return Point2d.fromIPoint2d(this); }

  public static fromCardinalDisplacement(from: IPoint2d, to: IPoint2d) {
    const matchingAxis = Point2d.fromIPoint2d(from).matchingAxes(to);
    if (matchingAxis.length !== 1) return undefined;
    if (matchingAxis[0] === Axis2d.x) return from.y > to.y ? this.up : this.down;
    return from.x > to.x ? this.left : this.right;
  }

  public static fromParameters({ x, y }: IPoint2d): Direction2d | undefined {
    if (x === 0) {
      return y > 0 ? this.down : (y !== 0 ? this.up : undefined);
    } else if (y === 0) {
      return x > 0 ? this.right : this.left;
    } else {
      return undefined;
    }
  }
}

class Point2d implements IPoint2d {
  public static terseToString = false;
  public toString() { return `(${this.x}, ${this.y})`; }
  public constructor(public x: number, public y: number) {}
  // #region Typing
  public toIntPoint2d() { return { x: Math.floor(this.x), y: Math.floor(this.y) }; }
  public static toIntPoint2d(p: IPoint2d) { return { x: Math.floor(p.x), y: Math.floor(p.y) }; }
  public toIPoint2d() { return { x: this.x, y: this.y }; }
  public static toIPoint2d(p: IPoint2d) { return { x: p.x, y: p.y }; }
  public static fromIPoint2d(p: IPoint2d) { return p instanceof Point2d ? p : new Point2d(p.x, p.y); }

  public readonly toIntObj = this.toIntPoint2d;
  public static readonly toIntObj = this.toIntPoint2d;
  public readonly toObj = this.toIPoint2d;
  public static readonly toObj = this.toIPoint2d;
  public static readonly fromObj = this.fromIPoint2d;
  // #endregion Typing

  // #region Axis
  public getAxis(a: Axis2d) { return a === Axis2d.x ? this.x : this.y; }
  public static getAxis(p: IPoint2d, a: Axis2d) { return a === Axis2d.x ? p.x : p.y; }
  public setAxis(a: Axis2d, value: number) { return a === Axis2d.x ? (this.x = value) : (this.y = value); }

  public matchingAxes(v: IPoint2d) {
    const r: Axis2d[] = [];
    if (this.x === v.x) r.push(Axis2d.x);
    if (this.y === v.y) r.push(Axis2d.y);
    return r;
  }

  public static matchingAxes(p1: IPoint2d, p2: IPoint2d) {
    const r: Axis2d[] = [];
    if (p1.x === p2.x) r.push(Axis2d.x);
    if (p1.y === p2.y) r.push(Axis2d.y);
    return r;
  }

  public isAxisAligned(other: IPoint2d) {
    let r = false;
    if (this.x === other.x) r = !r;
    if (this.y === other.y) r = !r;
    return r;
  }

  public static isAxisAligned(p1: IPoint2d, p2: IPoint2d) {
    let r = false;
    if (p1.x === p2.x) r = !r;
    if (p1.y === p2.y) r = !r;
    return r;
  }

  public allAxisAligned(...others: IPoint2d[]) {
    const axes = this.matchingAxes(others[0]!);
    switch (axes.length) {
    case 0:
      return false;
    case 1:
      return others.every(e => this.matchingAxes(e).includes(axes[0]!));
    default:
      return axes.some(e1 => others.every(e => this.matchingAxes(e).includes(e1)));
    }
  }

  public static allAxisAligned(...points: IPoint2d[]) {
    const axes = Point2d.matchingAxes(points[0]!, points[1]!);
    switch (axes.length) {
    case 0:
      return false;
    case 1:
      return points.every(e => Point2d.matchingAxes(points[0]!, e).includes(axes[0]!));
    default:
      return axes.some(e1 => points.every(e => Point2d.matchingAxes(points[0]!, e).includes(e1)));
    }
  }
  // #endregion Axis

  // #region Array Helpers
  /**
   * Is this point in the given array?
   *
   * Workaround for `Array.includes` not checking value equality.
   * @param a The array
   * @returns `true` if an object w/ the same values for `x` & `y` is in `a`, `false` otherwise
   */
  public included(a: IPoint2d[]) { return a.find(e => this.equals(e)) ? true : false; }
  /**
   * Is the given point in the given array?
   *
   * Workaround for `Array.includes` not checking value equality.
   * @param p The point
   * @param a The array
   * @returns `true` if an object w/ the same values for `x` & `y` as `p` is in `a`, `false` otherwise
   */
  public static included(p: IPoint2d, a: IPoint2d[]) { return a.find(e => this.equals(p, e)) ? true : false; }
  public static readonly includes = this.included;
  public indexIn(a: IPoint2d[], fromIndex?: number) {
    return a.findIndex(
      fromIndex === undefined
        ? e => this.equals(e)
        : (e, i) => i >= fromIndex && this.equals(e),
    );
  }

  public static indexIn(p: IPoint2d, a: IPoint2d[], fromIndex?: number) {
    return a.findIndex(
      fromIndex === undefined
        ? e => this.equals(p, e)
        : (e, i) => i >= fromIndex && this.equals(p, e),
    );
  }
  // #endregion Array Helpers

  // #region Math
  // #region Instance/Static Pairs
  public static subtract(p1: IPoint2d, p2: IPoint2d): Point2d {
    return new Point2d(
      p1.x - p2.x,
      p1.y - p2.y,
    );
  }

  public subtract({ x = 0, y = 0 }: IPoint2d) {
    this.x -= x;
    this.y -= y;
    return this;
  }

  public static add(p1: IPoint2d, p2: IPoint2d): Point2d {
    return new Point2d(
      p1.x + p2.x,
      p1.y + p2.y,
    );
  }

  public add({ x = 0, y = 0 }: IPoint2d) {
    this.x += x;
    this.y += y;
    return this;
  }

  public static equals(p1: IPoint2d | undefined, p2: IPoint2d | undefined): boolean {
    return !!p1 && !!p2 && p1.x == p2.x && p1.y == p2.y;
  }

  public equals(p?: IPoint2d) {
    return !!p && this.x == p.x && this.y == p.y;
  }

  public static scale(p: IPoint2d, v: number): Point2d {
    return new Point2d(
      p.x * v,
      p.y * v,
    );
  }

  public scale(v: number) {
    this.x *= v;
    this.y *= v;
    return this;
  }

  public static abs(p: IPoint2d): Point2d {
    return new Point2d(
      Math.abs(p.x),
      Math.abs(p.y),
    );
  }

  public abs() {
    this.x = Math.abs(this.x);
    this.y = Math.abs(this.y);
    return this;
  }

  public static magnitude(p: IPoint2d): number {
    return Math.sqrt(p.x * p.x + p.y * p.y);
  }

  public magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  // TODO: Refactor to `hasDisplacementOf`
  public static hasMagnitudeOf(p1: IPoint2d | undefined, magnitude: number, p2: IPoint2d | undefined): boolean {
    return !!p1 && !!p2 && Point2d.magnitude(Point2d.abs(Point2d.subtract(p1, p2))) == Math.abs(magnitude);
  }

  // TODO: Refactor to `hasDisplacementOf`
  public hasMagnitudeOf(magnitude: number, p: IPoint2d | undefined) {
    return !!p && Point2d.magnitude(Point2d.abs(Point2d.subtract(this, p))) == Math.abs(magnitude);
  }
  // #endregion Instance/Static Pairs

  public static midpoint(p1: IPoint2d, p2: IPoint2d): Point2d {
    return new Point2d(
      (p1.x + p2.x) / 2,
      (p1.y + p2.y) / 2,
    );
  }
  // #endregion Math

  /**
   * Doesn't match correctly for diagonal lines.
   *
   * TODO: Rename to `intersectsCardinally`
   * @param p1
   * @param p2
   * @returns
   */
  public intersects(p1: IPoint2d, p2: IPoint2d): boolean {
    const m1 = this.matchingAxes(p1);
    switch (m1.length) {
    case 0:
      return false;
    case 2:
      return true;
    case 1:
      break;
    default:
      throw new Error(`Invalid value from Point2d.matchingAxes(${p1}) (${m1})`);
    }
    const m2 = this.matchingAxes(p2);
    switch (m2.length) {
    case 0:
      return false;
    case 2:
      return true;
    case 1:
      break;
    default:
      throw new Error(`Invalid value from Point2d.matchingAxes(${p2}) (${m2})`);
    }
    const a = m1.filter(e => m2.includes(e));
    switch (a.length) {
    case 0:
      return false;
    case 1:
      break;
    default:
      throw new Error(`Invalid value from Point2d.intersects(${p2}) (${a})`);
    }
    // If this is aligned on the y axis, it must be between or on the extremes on the x, & vice versa.
    if (a[0]! === Axis2d.y) {
      return ((this.x <= p1.x && this.x >= p2.x) || (this.x <= p2.x && this.x >= p1.x));
    } else {
      return ((this.y <= p1.y && this.y >= p2.y) || (this.y <= p2.y && this.y >= p1.y));
    }
  }
}

interface IRect2d {
  width:  number;
  height: number;
  center: IPoint2d;
}
interface IExtents2d {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}
interface IBounds2d {
  min: IPoint2d;
  max: IPoint2d;
}

// TODO: Implement remaining setters (Change dimensions, or change min?)
// TODO: Integer rectangles don't have `min + width/height` as their max point.
class Rect2d implements IRect2d, IExtents2d, IBounds2d {
  // #region Properties
  public get width(): number { return this._width; }
  public set width(v: number) { this._width = Math.abs(v); }

  public get height(): number { return this._height; }
  public set height(v: number) { this._height = Math.abs(v); }

  public get dimensions(): IPoint2d { return { x: this.width, y: this.height }; }
  public set dimensions(v: IPoint2d) { ({ x: this.width, y: this.height } = v); }

  public min: IPoint2d;
  public get max(): IPoint2d { return Point2d.add(this.min, this.dimensions); }
  public get xExtent(): number { return this.width / 2; }
  public set xExtent(v: number) { this.width = v * 2; }
  public get yExtent(): number { return this.height / 2; }
  public set yExtent(v: number) { this.height = v * 2; }
  /** Half the width & height. */
  public get extents(): IPoint2d { return { x: this.xExtent, y: this.yExtent }; }
  public set extents(v: IPoint2d) { ({ x: this.xExtent, y: this.yExtent } = v); }
  public get center(): IPoint2d { return Point2d.add(this.min, this.extents); }

  public get xMin(): number { return this.min.x; }
  public get xMax(): number { return this.max.x; }
  public get yMin(): number { return this.min.y; }
  public get yMax(): number { return this.max.y; }

  public get leftEdge(): Point2d[] { return [new Point2d(this.xMin, this.yMin), new Point2d(this.xMin, this.yMax)]; }
  public get rightEdge(): Point2d[] { return [new Point2d(this.xMax, this.yMin), new Point2d(this.xMax, this.yMin)]; }
  public get topEdge(): Point2d[] { return [new Point2d(this.xMin, this.yMin), new Point2d(this.xMax, this.yMin)]; }
  public get bottomEdge(): Point2d[] { return [new Point2d(this.xMin, this.yMax), new Point2d(this.xMax, this.yMax)]; }

  public get edges() { return [this.leftEdge, this.rightEdge, this.topEdge, this.bottomEdge]; }
  // #endregion Properties

  // #region Constructors
  public static fromMinMax(min: IPoint2d, max: IPoint2d) {
    if (min.x > max.x) {
      const t = min.x;
      min.x = max.x;
      max.x = t;
    }
    if (min.y > max.y) {
      const t = min.y;
      min.y = max.y;
      max.y = t;
    }
    const dimensions = Point2d.subtract(max, min);
    return this.fromDimensionsAndMin(dimensions.x, dimensions.y, min);
  }

  public static fromExtents(xMin: number, xMax: number, yMin: number, yMax: number) {
    return this.fromMinMax({ x: xMin, y: yMin }, { x: xMax, y: yMax });
  }

  public static fromDimensionsAndCenter(width: number, height: number, point: IPoint2d) {
    // if (width < 0) width *= -1;
    // if (height < 0) height *= -1;
    // const extents = { x: width / 2, y: height / 2 };
    // return this.fromMinMax(Point2d.subtract(point, extents), Point2d.add(point, extents));
    return new Rect2d(width, height, point, true);
  }

  public static fromDimensionsAndMin(width: number, height: number, point: IPoint2d = { x: 0, y: 0 }) {
    // if (width < 0) width *= -1;
    // if (height < 0) height *= -1;
    // return this.fromMinMax(point, Point2d.add(point, { x: width, y: height }));
    return new Rect2d(width, height, point);
  }

  private constructor(private _width: number, private _height: number, point: IPoint2d, isCenter = false) {
    if (_width < 0) this._width *= -1;
    if (_height < 0) this._height *= -1;
    this.min = isCenter ? Point2d.subtract(point, this.extents) : point;
  }
  // #endregion Constructors

  public intersects(p: IPoint2d) {
    return (this.xMin <= p.x && this.xMax >= p.x && this.yMin <= p.y && this.yMax >= p.y);
  }

  public findIntersection(p: Point2d) {
    for (const edge of this.edges) {
      if (p.intersects(edge[0]!, edge[1]!)) return edge;
    }
    return false;
  }

  public wrap<P extends IPoint2d>(p: P) {
    while (p.x > this.xMax) p.x -= this.width;
    while (p.x < this.xMin) p.x += this.width;
    while (p.y > this.yMax) p.y -= this.height;
    while (p.y < this.yMin) p.y += this.height;
    return p;
  }
}

// TODO: Implement remaining setters (Change dimensions, or change min?)
// TODO: Integer rectangles don't have `min + width/height` as their max point.
class RectInt2d implements IRect2d, IExtents2d, IBounds2d {
  // #region Properties
  // #region Dimensions
  public get width(): number { return this._width; }
  public set width(v: number) { this._width = Math.abs(v); }

  public get height(): number { return this._height; }
  public set height(v: number) { this._height = Math.abs(v); }

  public get dimensions(): IPoint2d { return { x: this.width, y: this.height }; }
  public set dimensions(v: IPoint2d) { ({ x: this.width, y: this.height } = v); }
  // #endregion Dimensions

  public min: IPoint2d;
  public get max(): IPoint2d { return Point2d.add(this.min, Point2d.subtract(this.dimensions, { x: 1, y: 1 })); }
  public get xExtent(): number { return this.width / 2; }
  public set xExtent(v: number) { this.width = v * 2; }
  public get yExtent(): number { return this.height / 2; }
  public set yExtent(v: number) { this.height = v * 2; }
  /** Half the width & height. */
  public get extents(): IPoint2d { return { x: this.xExtent, y: this.yExtent }; }
  public set extents(v: IPoint2d) { ({ x: this.xExtent, y: this.yExtent } = v); }
  public get center(): IPoint2d { return Point2d.add(this.min, this.extents); }
  public get centerInt(): IPoint2d { return Point2d.toIntPoint2d(this.center); }

  public get xMin(): number { return this.min.x; }
  public get xMax(): number { return this.max.x; }
  public get yMin(): number { return this.min.y; }
  public get yMax(): number { return this.max.y; }

  // #region Edges
  public get leftEdge(): Point2d[] {
    return [
      new Point2d(this.xMin, this.yMin),
      new Point2d(this.xMin, this.yMax),
    ];
  }

  public get rightEdge(): Point2d[] {
    return [
      new Point2d(this.xMax, this.yMin),
      new Point2d(this.xMax, this.yMax),
    ];
  }

  public get topEdge(): Point2d[] {
    return [
      new Point2d(this.xMin, this.yMin),
      new Point2d(this.xMax, this.yMin),
    ];
  }

  public get bottomEdge(): Point2d[] {
    return [
      new Point2d(this.xMin, this.yMax),
      new Point2d(this.xMax, this.yMax),
    ];
  }

  public get edges() { return [this.leftEdge, this.rightEdge, this.topEdge, this.bottomEdge]; }

  public get leftBorderEdge(): Point2d[] {
    return [
      new Point2d(this.xMin - 1, this.yMin - 1),
      new Point2d(this.xMin - 1, this.yMax + 1),
    ];
  }

  public get rightBorderEdge(): Point2d[] {
    return [
      new Point2d(this.xMax + 1, this.yMin - 1),
      new Point2d(this.xMax + 1, this.yMax + 1),
    ];
  }

  public get topBorderEdge(): Point2d[] {
    return [
      new Point2d(this.xMin - 1, this.yMin - 1),
      new Point2d(this.xMax + 1, this.yMin - 1),
    ];
  }

  public get bottomBorderEdge(): Point2d[] {
    return [
      new Point2d(this.xMin - 1, this.yMax + 1),
      new Point2d(this.xMax + 1, this.yMax + 1),
    ];
  }

  public get borderEdges() { return [this.leftBorderEdge, this.rightBorderEdge, this.topBorderEdge, this.bottomBorderEdge]; }
  // #endregion Edges

  public get points(): IPoint2d[] {
    const rv: IPoint2d[] = [];
    for (let i = 0; i < this.width; i++)
      for (let j = 0; j < this.height; j++)
        rv.push({ x: i, y: j });
    return rv;
  }
  // #endregion Properties

  // #region Constructors
  /**
   * @param max Inclusive
   */
  public static fromMinMax(min: IPoint2d, max: IPoint2d) {
    if (min.x > max.x) {
      const t = min.x;
      min.x = max.x;
      max.x = t;
    }
    if (min.y > max.y) {
      const t = min.y;
      min.y = max.y;
      max.y = t;
    }
    const dimensions = Point2d.add(Point2d.subtract(max, min), { x: 1, y: 1 });
    return this.fromDimensionsAndMin(dimensions.x, dimensions.y, min);
  }

  public static fromDimensionsAndCenter(width: number, height: number, point: IPoint2d) {
    // if (width < 0) width *= -1;
    // if (height < 0) height *= -1;
    // const extents = { x: width / 2, y: height / 2 };
    // return this.fromMinMax(Point2d.subtract(point, extents), Point2d.add(point, extents));
    return new RectInt2d(width, height, point, true);
  }

  public static fromDimensionsAndMin(width: number, height: number, point: IPoint2d = { x: 0, y: 0 }) {
    // if (width < 0) width *= -1;
    // if (height < 0) height *= -1;
    // return this.fromMinMax(point, Point2d.add(point, { x: width, y: height }));
    return new RectInt2d(width, height, point);
  }

  private constructor(private _width: number, private _height: number, point: IPoint2d, isCenter = false) {
    if (_width < 0) this._width *= -1;
    if (_height < 0) this._height *= -1;
    this.min = isCenter ? Point2d.subtract(point, this.extents) : point;
  }
  // #endregion Constructors

  public intersects(p: IPoint2d) {
    return this.xMin <= p.x && this.xMax >= p.x && this.yMin <= p.y && this.yMax >= p.y;
  }

  /**
   * Finds the point on the perimeter where the point intersects.
   */
  public findIntersection(p: Point2d) {
    for (const edge of this.edges) {
      if (p.intersects(edge[0]!, edge[1]!)) return edge;
    }
    return false;
  }

  /**
   * Finds the point on the line segments bordering the perimeter where the point intersects.
   */
  public findBorderIntersection(p: Point2d) {
    for (const edge of this.borderEdges) {
      if (p.intersects(edge[0]!, edge[1]!)) return edge;
    }
    return false;
  }

  public wrap<P extends IPoint2d>(p: P) {
    while (p.x > this.xMax) p.x -= this.width;
    while (p.x < this.xMin) p.x += this.width;
    while (p.y > this.yMax) p.y -= this.height;
    while (p.y < this.yMin) p.y += this.height;
    return p;
  }

  /**
   * @param p The point to change; WILL BE MUTATED
   */
  public unwrap<P extends IPoint2d>(p: P, axis: Axis2d, operation: "increment" | "decrement") {
    if (axis === Axis2d.x) {
      if (operation === "decrement") p.x -= this.width;
      else if (operation === "increment") p.x += this.width;
    } else {
      if (operation === "decrement") p.y -= this.height;
      else if (operation === "increment") p.y += this.height;
    }
    return p;
  }

  /**
   * @param p The point to change; WILL BE MUTATED
   * @param reference The point to use to make a guess on how to unwrap the altered point
   */
  public unwrapRelative<P extends IPoint2d>(p: P, reference: Readonly<P>) {
    const axis = Point2d.matchingAxes(p, reference)[0]! === Axis2d.x ? Axis2d.y : Axis2d.x;
    const op = Point2d.getAxis(reference, axis) > Point2d.getAxis(p, axis) ? "increment" : "decrement";
    return this.unwrap(p, axis, op);
  }

  public generatePointsWhere(predicate: (value: IPoint2d, index: number) => boolean) {
    const rv: IPoint2d[] = [];
    for (let i = 0; i < this.width; i++)
      for (let j = 0, e = { x: i, y: j }; j < this.height; j++, e = { x: i, y: j })
        if (predicate(e, i * this.width + j))
          rv.push({ x: i, y: j });
    return rv;
  }
}

export {
  Point2d as Point,
  Point2d,
  Axis2d as Axis,
  Axis2d,
  Direction2d as Direction,
  Direction2d,
  Rect2d as Rect,
  Rect2d,
  RectInt2d as RectInt,
  RectInt2d,
};
export type {
  IPoint2d as IPoint,
  IPoint2d,
  IRect2d as IRect,
  IRect2d,
  IExtents2d as IExtents,
  IExtents2d,
  IBounds2d as IBounds,
  IBounds2d,
};
