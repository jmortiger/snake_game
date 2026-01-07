/**
 * @module 2dTypes
 * A container
 */

/** An object w/ an x & y property. */
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
  private constructor(
    public readonly x: number,
    public readonly y: number,
  ) {}

  public get opposite() { return Direction2d.fromParameters(Point2d.scale(this, -1))!; }

  public static fromCardinalDisplacement(p1: IPoint2d, p2: IPoint2d) {
    const matchingAxis = Point2d.fromIPoint2d(p1).matchingAxes(p2);
    if (matchingAxis.length !== 1) return undefined;
    if (matchingAxis[0] === Axis2d.x) return p1.y > p2.y ? this.down : this.up;
    return p1.x > p2.x ? this.right : this.left;
  }

  public static fromParameters({ x, y }: IPoint2d): Direction2d | undefined {
    if (x === 0) {
      return y > 0 ? this.down : (y !== 0 ? this.up : undefined);
    } else if (y === 0) {
      return x > 0 ? this.right : this.left;
    } else {
      // throw new Error("");
      return undefined;
    }
  }
}

class Point2d implements IPoint2d {
  public toIPoint2d() { return { x: this.x, y: this.y }; }
  public static toIPoint2d(p: IPoint2d) { return { x: p.x, y: p.y }; }
  public static fromIPoint2d(p: IPoint2d) { return p instanceof Point2d ? p : new Point2d(p.x, p.y); }
  constructor(public x: number, public y: number) {}
  public getAxis(a: Axis2d) { return a === Axis2d.x ? this.x : this.y; }
  public setAxis(a: Axis2d, value: number) { return a === Axis2d.x ? (this.x = value) : (this.y = value); }
  public matchingAxes(v: IPoint2d) {
    const r: Axis2d[] = [];
    if (v.x === this.x) r.push(Axis2d.x);
    if (v.y === this.y) r.push(Axis2d.y);
    return r;
  }

  // #region Math
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
  // #endregion Math

  /**
   * Doesn't match correctly for diagonal lines.
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
        throw new Error(`Invalid value from Point2d.matchingAxes(${p2}) (${m2})`);
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
  width: number;
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
  // public set max(v: IPoint2d) { return Point2d.add(this.min, this.dimensions); }
  public get xExtent(): number { return this.width / 2; }
  public set xExtent(v: number) { this.width = v * 2; }
  public get yExtent(): number { return this.height / 2; }
  public set yExtent(v: number) { this.height = v * 2; }
  /** Half the width & height. */
  public get extents(): IPoint2d { return { x: this.xExtent, y: this.yExtent }; }
  public set extents(v: IPoint2d) { ({ x: this.xExtent, y: this.yExtent } = v); }
  public get center(): IPoint2d { return Point2d.add(this.min, this.extents); }
  // public set center(v: IPoint2d) { return Point2d.add(this.min, this.extents); }

  public get xMin(): number { return this.min.x - this.xExtent; }
  // public set xMin(v: number) { return this.min.x - this.xExtent; }
  public get xMax(): number { return this.min.x + this.xExtent; }
  // public set xMax(v: number) { return this.min.x + this.xExtent; }
  public get yMin(): number { return this.min.y - this.yExtent; }
  // public set yMin(v: number) { return this.min.y - this.yExtent; }
  public get yMax(): number { return this.min.y + this.yExtent; }
  // public set yMax(v: number) { return this.min.y + this.yExtent; }

  public get leftEdge(): Point2d[] { return [new Point2d(this.xMin, this.yMin), new Point2d(this.xMin, this.yMax)]; }
  // public set leftEdge(v: Point2d[]) {  }
  public get rightEdge(): Point2d[] { return [new Point2d(this.xMax, this.yMin), new Point2d(this.xMax, this.yMin)]; }
  // public set rightEdge(v: Point2d[]) {  }
  public get topEdge(): Point2d[] { return [new Point2d(this.xMin, this.yMin), new Point2d(this.xMax, this.yMin)]; }
  // public set topEdge(v: Point2d[]) {  }
  public get bottomEdge(): Point2d[] { return [new Point2d(this.xMin, this.yMax), new Point2d(this.xMax, this.yMax)]; }
  // public set bottomEdge(v: Point2d[]) {  }

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

export {
  Point2d as Point,
  Point2d,
  Axis2d as Axis,
  Axis2d,
  Direction2d as Direction,
  Direction2d,
  Rect2d as Rect,
  Rect2d,
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
