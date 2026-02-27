import type { IPoint, RectInt } from "./Point2d";
import { Point } from "./Point2d";

class DebugLevel {
  // #region Instances
  public static readonly NONE = new DebugLevel(0, () => {});
  public static readonly ERROR = new DebugLevel(1, console.error);
  public static readonly WARN = new DebugLevel(2, console.warn);
  public static readonly INFO = new DebugLevel(3, console.info);
  public static readonly LOG = new DebugLevel(4, console.log);
  public static readonly DEBUG = new DebugLevel(5, console.debug);

  private constructor(
    public readonly index: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly _print: (...data: any[]) => void,
  ) {}
  // #endregion Instances

  // #region Parameter Serialization
  public static clone = false;
  public static stringify = true;
  public static parse = true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static handleParams(data: any[]) {
    if (this.clone) return data.map(e => typeof e !== "object" ? e : structuredClone(e));
    if (!this.stringify) return data;
    return data.map((e) => {
      if (typeof e !== "object") return e;
      return this.parse
        ? JSON.parse(JSON.stringify(e))
        : JSON.stringify(e);
    });
  }
  // #endregion Parameter Serialization

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public print(level: DebugLevel, ...data: any[]) {
    if (this.index >= level.index) level._print(...DebugLevel.handleParams(data));
  }

  public do<T, U>(
    level: DebugLevel,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cb: (printMethod: (...data: any[]) => void) => T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    or?: (printMethod: (...data: any[]) => void) => U,
  ) {
    return (this.index >= level.index && this.index !== 0)
      ? cb(level._print)
      : or ? or(level._print) : undefined;
  }

  /**
   * Trigger a debugger to pause execution if the level is satisfied.
   * @param level
   */
  public debugger(level: DebugLevel = DebugLevel.DEBUG) {
    // eslint-disable-next-line no-debugger
    if (this.index >= level.index && this.index !== 0) debugger;
  }

  /**
   * Trigger a new console group if the level is satisfied.
   * @param level
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public group(level: DebugLevel, ...data: any[]) {
    if (this.index >= level.index && this.index !== 0) console.group(...DebugLevel.handleParams(data));
  }

  /**
   * Close the current console group if the level is satisfied.
   * @param level
   */
  public groupEnd(level: DebugLevel) {
    if (this.index >= level.index && this.index !== 0) console.groupEnd();
  }

  public static tableFromPointsAndPlayfield(points: IPoint[], playfield: RectInt, asIndex = true) {
    const arr: Array<Array<IPoint | undefined>> = [];
    for (let j = 0; j < playfield.height; j++) {
      const temp = [];
      for (let i = 0; i < playfield.width; i++) {
        // temp.push(points.find(e => Point.equals(e, { x: i, y: j })));
        if (asIndex) {
          temp.push(points.findIndex(e => Point.equals(e, { x: i, y: j })));
          continue;
        }
        const v = points.find(e => Point.equals(e, { x: i, y: j }));
        temp.push(v ? JSON.parse(JSON.stringify(v)) : v);
      }
      arr.push(temp);
    }
    console.table(arr);
  }

  public static tableFromPointsAndDimensions(points: IPoint[], width: number, height: number, asIndex = true) {
    const arr: Array<Array<IPoint | undefined>> = [];
    for (let j = 0; j < height; j++) {
      const temp = [];
      for (let i = 0; i < width; i++) {
        if (asIndex) {
          temp.push(points.findIndex(e => Point.equals(e, { x: i, y: j })));
          continue;
        }
        const v = points.find(e => Point.equals(e, { x: i, y: j }));
        temp.push(v ? JSON.parse(JSON.stringify(v)) : v);
      }
      arr.push(temp);
    }
    console.table(arr);
  }
  /* public static tableFromPoints(points: IPoint[], playfield: RectInt, asStrings = false) {
    const arr: Array<Array<IPoint | string | undefined>> = [];
    for (let j = 0; j < playfield.height; j++) {
      const temp = [];
      for (let i = 0; i < playfield.width; i++) {
        temp.push(points.find(e => Point.equals(e, { x: i, y: j })));
        if (asStrings) temp[temp.length - 1] = JSON.stringify(temp.at(-1));
      }
      arr.push(temp);
    }
    console.table(arr);
  } */
}

const NONE  = DebugLevel.NONE,
      ERROR = DebugLevel.ERROR,
      WARN  = DebugLevel.WARN,
      INFO  = DebugLevel.INFO,
      LOG   = DebugLevel.LOG,
      DEBUG = DebugLevel.DEBUG;

export {
  DebugLevel,
  NONE,
  ERROR,
  WARN,
  INFO,
  LOG,
  DEBUG,
};