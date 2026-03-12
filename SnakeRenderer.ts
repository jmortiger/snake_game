import { DebugLevel } from "./DebugLevel";
import type { GameStateEvent } from "./Events";
import { RectInt2d } from "./Point2d";
import { SnakeEngine } from "./SnakeEngine";
import { EngineConfig, type IEngineConfig } from "./Types";

class SnakeRenderer {
  public readonly engine:  SnakeEngine;
  public readonly wrapper: CtxWrapper;
  public get outputSquareWidth() {
    return this.ctx.canvas.clientWidth <= this.ctx.canvas.clientHeight
      ? this.ctx.canvas.clientWidth
      : this.ctx.canvas.clientHeight;
  }

  public get renderedCellWidth() {
    return Math.floor(this.outputSquareWidth / this.engine.playfieldRect.width);
  }

  public get playfieldRenderedWidth() {
    return this.renderedCellWidth * this.engine.playfieldRect.width;
  }

  public get renderedCellRect() {
    return RectInt2d.fromDimensionsAndMin(this.playfieldRenderedWidth, this.playfieldRenderedWidth);
  }

  public readonly ctx: CanvasRenderingContext2D;
  public constructor(
    public readonly canvas: HTMLCanvasElement,
    public readonly config: IEngineConfig = EngineConfig.defaultConfig,
  ) {
    this.engine = new SnakeEngine(config);
    this.ctx = canvas.getContext("2d")!;
    this.wrapper = new CtxWrapper(this.ctx);
  }

  public initGame() {
    this.engine.initGame();
    this.engine.onTickCompleted.add(e => this.draw(e));
  }

  public startGame() {
    this.engine.startGame();
    this.draw({ engine: this.engine });
  }

  public draw(args: GameStateEvent) {
    this.wrapper.fillSquareFull(0, 0, this.outputSquareWidth, { lineWidth: 2, fillStyle: this.engine.isGameOver ? "rgba(255, 0, 0, .25)" : "rgba(255, 255, 255, .25)" });
    const snakeSquares = args.engine.snake.filledNodes;
    SnakeEngine.debugLevel.print(DebugLevel.LOG, "Drawn nodes (%s): %o", snakeSquares.length, snakeSquares);

    this.wrapper.autoSave = true;
    this.wrapper.autoRestore = false;
    this.wrapper.strokeSquareFull(0, 0, this.outputSquareWidth, { lineWidth: 2, strokeStyle: "black" });
    this.wrapper.autoSave = false;
    this.wrapper.autoRestore = false;
    for (let i = 0, offsetWidth = 0; i < this.engine.playfieldRect.width; i++, offsetWidth = i * this.renderedCellWidth) {
      for (let j = 0, offsetHeight = 0; j < this.engine.playfieldRect.height; j++, offsetHeight = j * this.renderedCellWidth) {
        this.wrapper.strokeSquareFull(offsetWidth, offsetHeight, this.renderedCellWidth);
        if (snakeSquares.find(e => e.x === i && e.y === j)) {
          this.wrapper.autoSave = this.wrapper.autoRestore = true;
          this.wrapper.fillSquareFull(offsetWidth, offsetHeight, this.renderedCellWidth, { lineWidth: 2, fillStyle: this.engine.snake.head.equals({ x: i, y: j })
            ? "red"
            : (this.engine.snake.snakeNodesDebug.find(e => e.equals({ x: i, y: j }))
              ? "blue"
              : "black") });
          this.wrapper.autoSave = this.wrapper.autoRestore = false;
          /* this.ctx.save();
          this.ctx.fillStyle = "black";
          this.ctx.ellipse(offsetWidth + Math.floor(this.effectiveGridCellWidth / 2), offsetHeight + Math.floor(this.effectiveGridCellWidth / 2), this.effectiveGridCellWidth, this.effectiveGridCellWidth, 0, 0, 2 * Math.PI);
          this.ctx.fill();
          this.ctx.restore(); */
        } else if (this.engine.currPellets.find(e => e.equals({ x: i, y: j }))) {
          this.wrapper.autoSave = this.wrapper.autoRestore = true;
          this.wrapper.fillSquareFull(offsetWidth, offsetHeight, this.renderedCellWidth, { lineWidth: 2, fillStyle: "yellow" });
          this.wrapper.autoSave = this.wrapper.autoRestore = false;
        }
      }
    }
    this.wrapper.restore();
  }

  public drawGrid() {
    // this.ctx.fillStyle = this.ctx.strokeStyle = "black";
    // this.ctx.lineWidth = 2;
    // this.ctx.strokeRect(1, 1, this.outputSquareWidth - 1, this.outputSquareWidth - 1);
    this.wrapper.autoSave = true;
    this.wrapper.autoRestore = false;
    this.wrapper.strokeSquareFull(0, 0, this.outputSquareWidth, { lineWidth: 2, strokeStyle: "black" });
    this.wrapper.autoSave = false;
    this.wrapper.autoRestore = false;
    for (let i = 0; i < this.engine.playfieldRect.width; i++) {
      for (let j = 0; j < this.engine.playfieldRect.height; j++) {
        this.wrapper.strokeSquareFull(i * this.renderedCellWidth, j * this.renderedCellWidth, this.renderedCellWidth);
      }
    }
    // this.wrapper.autoSave = true;
    // this.wrapper.autoRestore = false;
  }
}

type CtxRectParameters = {
  /** The x-axis coordinate of the rectangle's starting point. */
  x: number;
  /** The y-axis coordinate of the rectangle's starting point. */
  y: number;
  /** The rectangle's width. Positive values are to the right, and negative to the left. */
  w: number;
  /** The rectangle's height. Positive values are down, and negative are up. */
  h: number;
};
type CtxEllipseParameters = {
  /** The x-axis (horizontal) coordinate of the ellipse's center. */
  x:                 number;
  /** The y-axis (vertical) coordinate of the ellipse's center. */
  y:                 number;
  /** The ellipse's major-axis radius. Must be non-negative. */
  radiusX:           number;
  /** The ellipse's minor-axis radius. Must be non-negative. */
  radiusY:           number;
  /** The eccentric angle at which the ellipse starts, measured clockwise from the positive x-axis and expressed in radians. */
  startAngle:        number;
  /** The eccentric angle at which the ellipse ends, measured clockwise from the positive x-axis and expressed in radians. */
  endAngle:          number;
  /** An optional boolean value which, if true, draws the ellipse counterclockwise (anticlockwise). The default value is false (clockwise). */
  counterClockwise?: boolean;
};
type CtxRectOptions = {
  fillStyle?:   string;
  strokeStyle?: string;
  lineWidth?:   number;
};
/* enum DrawMethod {
  stroke, fill, clear
}
type RectMethod = (x: number, y: number, w: number, h: number) => void; */
interface CtxWrapperSettings {
  autoRestore?: boolean;
  autoSave?:    boolean;
}
class CtxWrapper implements CtxWrapperSettings {
  // #region Static
  public static autoSave = false;
  public static autoRestore = false;

  /**
   * Optionally save the current canvas options, update the relevant canvas options, & determine the effective drawing parameters for the given rectangle.
   * @param ctx
   * @param x The outermost x coordinate of the rectangle, including its stroke.
   * @param y The outermost y coordinate of the rectangle, including its stroke.
   * @param width The total width of the rectangle, including its stroke.
   * @param height The total height of the rectangle, including its stroke.
   * @param param5 The settings to change to draw the upcoming rectangle.
   * @param wrapperSettings
   * @returns The appropriate values to use directly in `CanvasRenderingContext2D.strokeRect` to achieve the desired effect. If not drawing a stroke, can be ignored(?).
   */
  public static prepRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    { strokeStyle, fillStyle, lineWidth }: CtxRectOptions,
    wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  ) {
    if (wrapperSettings.autoSave ?? this.autoSave) ctx.save();
    if (strokeStyle) ctx.strokeStyle = strokeStyle;
    if (fillStyle) ctx.fillStyle = fillStyle;
    if (lineWidth) ctx.lineWidth = lineWidth;
    const offset = ctx.lineWidth / 2;
    x += offset;
    y += offset;
    width -= ctx.lineWidth;
    height -= ctx.lineWidth;
    return { x, y, width, height, w: width, h: height };
  }

  public static prepSquare(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    options: CtxRectOptions,
    wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  ) {
    return this.prepRect(ctx, x, y, width, width, options, wrapperSettings);
  }

  /* public static shellRectFull(
    method: RectMethod,
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    { fillStyle, strokeStyle, lineWidth }: CtxRectOptions,
    wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  ) {
    const p = this.prepRect(ctx, x, y, width, height, { fillStyle, strokeStyle, lineWidth }, wrapperSettings);
    method(p.x, p.y, p.width, p.height);
    if (wrapperSettings.autoRestore ?? this.autoRestore) ctx.restore();
  } */

  public static strokeRectFull(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    { strokeStyle, lineWidth }: CtxRectOptions,
    wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  ) {
    const p = this.prepRect(ctx, x, y, width, height, { strokeStyle, lineWidth }, wrapperSettings);
    ctx.strokeRect(p.x, p.y, p.width, p.height);
    if (wrapperSettings.autoRestore ?? this.autoRestore) ctx.restore();
  }

  public static strokeSquareFull(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    { strokeStyle, lineWidth }: CtxRectOptions,
    wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  ) {
    const p = this.prepRect(ctx, x, y, width, width, { strokeStyle, lineWidth }, wrapperSettings);
    ctx.strokeRect(p.x, p.y, p.width, p.height);
    if (wrapperSettings.autoRestore ?? this.autoRestore) ctx.restore();
  }

  public static fillRectFull(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    { fillStyle, lineWidth }: CtxRectOptions,
    wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  ) {
    const p = this.prepRect(ctx, x, y, width, height, { fillStyle, lineWidth }, wrapperSettings);
    ctx.fillRect(p.x, p.y, p.width, p.height);
    if (wrapperSettings.autoRestore ?? this.autoRestore) ctx.restore();
  }

  public static fillSquareFull(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    { fillStyle, lineWidth }: CtxRectOptions,
    wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  ) {
    const p = this.prepRect(ctx, x, y, width, width, { fillStyle, lineWidth }, wrapperSettings);
    ctx.fillRect(p.x, p.y, p.width, p.height);
    if (wrapperSettings.autoRestore ?? this.autoRestore) ctx.restore();
  }

  public static clearRectFull(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    { strokeStyle, lineWidth }: CtxRectOptions,
    wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  ) {
    const p = this.prepRect(ctx, x, y, width, height, { strokeStyle, lineWidth }, wrapperSettings);
    ctx.clearRect(p.x, p.y, p.width, p.height);
    if (wrapperSettings.autoRestore ?? this.autoRestore) ctx.restore();
  }

  public static clearSquareFull(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    { strokeStyle, lineWidth }: CtxRectOptions,
    wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  ) {
    const p = this.prepRect(ctx, x, y, width, width, { strokeStyle, lineWidth }, wrapperSettings);
    ctx.clearRect(p.x, p.y, p.width, p.height);
    if (wrapperSettings.autoRestore ?? this.autoRestore) ctx.restore();
  }

  // /**
  //  *
  //  * @param ctx
  //  * @param x The x-axis (horizontal) coordinate of the ellipse's center.
  //  * @param y The y-axis (vertical) coordinate of the ellipse's center.
  //  * @param radiusX The ellipse's major-axis radius. Must be non-negative.
  //  * @param radiusY The ellipse's minor-axis radius. Must be non-negative.
  //  * @param startAngle The eccentric angle at which the ellipse starts, measured clockwise from the positive x-axis and expressed in radians.
  //  * @param endAngle The eccentric angle at which the ellipse ends, measured clockwise from the positive x-axis and expressed in radians.
  //  * @param counterClockwise An optional boolean value which, if true, draws the ellipse counterclockwise (anticlockwise). The default value is false (clockwise).
  //  * @param options
  //  * @param wrapperSettings
  //  * @returns
  //  */
  // public static prepEllipse(
  //   ctx: CanvasRenderingContext2D,
  //   x: number,
  //   y: number,
  //   radiusX: number,
  //   radiusY: number,
  //   startAngle: number,
  //   endAngle: number,
  //   counterClockwise?: boolean,
  //   options?: CtxRectOptions,
  //   wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  // ) {
  //   if (wrapperSettings.autoSave ?? this.autoSave) ctx.save();
  //   if (options?.strokeStyle) ctx.strokeStyle = options.strokeStyle;
  //   if (options?.fillStyle) ctx.fillStyle = options.fillStyle;
  //   if (options?.lineWidth) ctx.lineWidth = options.lineWidth;
  //   const offset = ctx.lineWidth / 2;
  //   x += offset;
  //   y += offset;
  //   width -= ctx.lineWidth;
  //   height -= ctx.lineWidth;
  //   return { x, y, width, height, w: width, h: height };
  // }

  // public static prepCircle(
  //   ctx: CanvasRenderingContext2D,
  //   x: number,
  //   y: number,
  //   width: number,
  //   options?: CtxRectOptions,
  //   wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  // ) {
  //   return this.prepEllipse(ctx, x, y, width, width, options, wrapperSettings);
  // }

  // /* public static shellEllipseFull(
  //   method: EllipseMethod,
  //   ctx: CanvasRenderingContext2D,
  //   x: number,
  //   y: number,
  //   width: number,
  //   height: number,
  //   { fillStyle, strokeStyle, lineWidth }: CtxRectOptions,
  //   wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  // ) {
  //   const p = this.prepEllipse(ctx, x, y, width, height, { fillStyle, strokeStyle, lineWidth }, wrapperSettings);
  //   method(p.x, p.y, p.width, p.height);
  //   if (wrapperSettings.autoRestore ?? this.autoRestore) ctx.restore();
  // } */

  // public static strokeEllipseFull(
  //   ctx: CanvasRenderingContext2D,
  //   x: number,
  //   y: number,
  //   width: number,
  //   height: number,
  //   { strokeStyle, lineWidth }: CtxRectOptions,
  //   wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  // ) {
  //   const p = this.prepEllipse(ctx, x, y, width, height, { strokeStyle, lineWidth }, wrapperSettings);
  //   ctx.strokeEllipse(p.x, p.y, p.width, p.height);
  //   if (wrapperSettings.autoRestore ?? this.autoRestore) ctx.restore();
  // }

  // public static strokeCircleFull(
  //   ctx: CanvasRenderingContext2D,
  //   x: number,
  //   y: number,
  //   width: number,
  //   { strokeStyle, lineWidth }: CtxRectOptions,
  //   wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  // ) {
  //   const p = this.prepEllipse(ctx, x, y, width, width, { strokeStyle, lineWidth }, wrapperSettings);
  //   ctx.strokeEllipse(p.x, p.y, p.width, p.height);
  //   if (wrapperSettings.autoRestore ?? this.autoRestore) ctx.restore();
  // }

  // public static fillEllipseFull(
  //   ctx: CanvasRenderingContext2D,
  //   x: number,
  //   y: number,
  //   width: number,
  //   height: number,
  //   { fillStyle, lineWidth }: CtxRectOptions,
  //   wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  // ) {
  //   const p = this.prepEllipse(ctx, x, y, width, height, { fillStyle, lineWidth }, wrapperSettings);
  //   ctx.fillEllipse(p.x, p.y, p.width, p.height);
  //   if (wrapperSettings.autoRestore ?? this.autoRestore) ctx.restore();
  // }

  // public static fillCircleFull(
  //   ctx: CanvasRenderingContext2D,
  //   x: number,
  //   y: number,
  //   width: number,
  //   { fillStyle, lineWidth }: CtxRectOptions,
  //   wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  // ) {
  //   const p = this.prepEllipse(ctx, x, y, width, width, { fillStyle, lineWidth }, wrapperSettings);
  //   ctx.fillEllipse(p.x, p.y, p.width, p.height);
  //   if (wrapperSettings.autoRestore ?? this.autoRestore) ctx.restore();
  // }

  // public static clearEllipseFull(
  //   ctx: CanvasRenderingContext2D,
  //   x: number,
  //   y: number,
  //   width: number,
  //   height: number,
  //   { lineWidth }: CtxRectOptions,
  //   wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  // ) {
  //   const p = this.prepEllipse(ctx, x, y, width, height, { lineWidth }, wrapperSettings);
  //   ctx.clearEllipse(p.x, p.y, p.width, p.height);
  //   if (wrapperSettings.autoRestore ?? this.autoRestore) ctx.restore();
  // }

  // public static clearCircleFull(
  //   ctx: CanvasRenderingContext2D,
  //   x: number,
  //   y: number,
  //   width: number,
  //   { lineWidth }: CtxRectOptions,
  //   wrapperSettings: CtxWrapperSettings = { autoRestore: this.autoRestore, autoSave: this.autoSave },
  // ) {
  //   const p = this.prepEllipse(ctx, x, y, width, width, { lineWidth }, wrapperSettings);
  //   ctx.clearEllipse(p.x, p.y, p.width, p.height);
  //   if (wrapperSettings.autoRestore ?? this.autoRestore) ctx.restore();
  // }

  /* // #region Images
  public static readonly imgMap = new Map<string, HTMLImageElement | undefined>();
  public static registerImg(identifier: string, resourceURL: string) {
    if (this.imgMap.has(identifier)) return;
    this.imgMap.set(identifier, new Image())
  }
  // #endregion Images */
  // #endregion Static

  // #region Instance
  // #region Saved Context Management
  private onSave() { if (this.autoSave) this.saveStack++; }
  private onRestore() { if (this.autoRestore) this.saveStack--; }

  public save() {
    this.ctx.save();
    this.onSave();
  }

  public restore() {
    this.ctx.restore();
    this.onRestore();
  }
  // #endregion Saved Context Management

  constructor(
    public readonly ctx: CanvasRenderingContext2D,
    public autoRestore: boolean = true,
    public autoSave: boolean = true,
    private saveStack = 0,
  ) {}

  public prepRect(
    x: number,
    y: number,
    width: number,
    height: number,
    options: CtxRectOptions = {},
  ) {
    this.onSave();
    return CtxWrapper.prepRect(this.ctx, x, y, width, height, options, this);
  }

  public strokeRectFull(
    x: number,
    y: number,
    width: number,
    height: number,
    options: CtxRectOptions = {},
  ) {
    // const orig = CtxWrapper.autoRestore;
    // CtxWrapper.autoRestore = this.autoRestore;
    this.onSave();
    CtxWrapper.strokeRectFull(this.ctx, x, y, width, height, options, this);
    this.onRestore();
    // CtxWrapper.autoRestore = orig;
  }

  public strokeSquareFull(
    x: number,
    y: number,
    width: number,
    options: CtxRectOptions = {},
  ) {
    // const orig = CtxWrapper.autoRestore;
    // CtxWrapper.autoRestore = this.autoRestore;
    this.onSave();
    CtxWrapper.strokeSquareFull(this.ctx, x, y, width, options, this);
    this.onRestore();
    // CtxWrapper.autoRestore = orig;
  }

  public fillSquareFull(
    x: number,
    y: number,
    width: number,
    options: CtxRectOptions = {},
  ) {
    // const orig = CtxWrapper.autoRestore;
    // CtxWrapper.autoRestore = this.autoRestore;
    this.onSave();
    CtxWrapper.fillSquareFull(this.ctx, x, y, width, options, this);
    this.onRestore();
    // CtxWrapper.autoRestore = orig;
  }
  // #endregion Instance
}

export default SnakeRenderer;
