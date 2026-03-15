import { DebugLevel } from "./DebugLevel";
import type { GameStateEvent } from "./Events";
import { RectInt2d, Direction2d } from "./Point2d";
import { SnakeEngine } from "./SnakeEngine";
import { SnakeAssetPack, SnakeImage } from "./SnakeImage";
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

  public readonly ctx:       CanvasRenderingContext2D;
  public readonly assetPack: SnakeAssetPack;
  public constructor(
    public readonly canvas: HTMLCanvasElement,
    public readonly config: IEngineConfig = EngineConfig.defaultConfig,
  ) {
    this.engine = new SnakeEngine(config);
    this.ctx = canvas.getContext("2d")!;
    this.wrapper = new CtxWrapper(this.ctx);
    this.assetPack = new SnakeAssetPack(
      { url: "assets/snakeHead.png" },
      { url: "assets/snakeBody.png" },
      { url: "assets/pellet.png" },
      { url: "assets/bgTile.png" },
      { url: "assets/bgCornerTopLeft.png" },
      { url: "assets/bgBorderLeft.png" },
    );
  }

  public async initGame() {
    // Wait for all assets to load before initializing the game
    await this.assetPack.promise;
    this.engine.initGame();
    this.engine.onTickCompleted.add(e => this.draw(e));
  }

  public startGame() {
    this.engine.startGame();
    this.draw({ engine: this.engine });
  }

  private getTileType(x: number, y: number): "corner" | "border" | "tile" {
    const width = this.engine.playfieldRect.width;
    const height = this.engine.playfieldRect.height;
    const isTopEdge = y === 0;
    const isBottomEdge = y === height - 1;
    const isLeftEdge = x === 0;
    const isRightEdge = x === width - 1;

    if ((isTopEdge || isBottomEdge) && (isLeftEdge || isRightEdge)) {
      return "corner";
    } else if (isTopEdge || isBottomEdge || isLeftEdge || isRightEdge) {
      return "border";
    } else {
      return "tile";
    }
  }

  private getRotationAngle(x: number, y: number, tileType: "corner" | "border"): number {
    const width = this.engine.playfieldRect.width;
    const height = this.engine.playfieldRect.height;

    if (tileType === "corner") {
      if (x === 0 && y === 0) return 0;                     // Top-left (0°)
      if (x === width - 1 && y === 0) return 90;            // Top-right (90°)
      if (x === width - 1 && y === height - 1) return 180;  // Bottom-right (180°)
      if (x === 0 && y === height - 1) return 270;          // Bottom-left (270°)
    } else if (tileType === "border") {
      if (x === 0) return 0;                                // Left edge (0°)
      if (y === 0) return 90;                               // Top edge (90°)
      if (x === width - 1) return 180;                      // Right edge (180°)
      if (y === height - 1) return 270;                     // Bottom edge (270°)
    }
    return 0;
  }

  private drawRotatedTile(identifier: string, x: number, y: number, angle: number) {
    this.ctx.save();
    this.ctx.translate(x + this.renderedCellWidth / 2, y + this.renderedCellWidth / 2);
    this.ctx.rotate((angle * Math.PI) / 180);
    const imageDrawn = SnakeImage.tryDrawImage(
      this.ctx,
      identifier,
      -this.renderedCellWidth / 2,
      -this.renderedCellWidth / 2,
      { x: this.renderedCellWidth, y: this.renderedCellWidth }
    );
    this.ctx.restore();
    return imageDrawn;
  }

  private getSnakeHeadRotationAngle(): number {
    const direction = this.engine.currentDirection;
    // Asset originally points left, so map directions to rotation angles
    if (direction === Direction2d.left) return 0;     // No rotation needed
    if (direction === Direction2d.right) return 180;  // Flip horizontally
    if (direction === Direction2d.up) return 90;      // Rotate 90° clockwise
    if (direction === Direction2d.down) return 270;   // Rotate 270° clockwise (90° counter-clockwise)
    return 0; // Default to no rotation
  }

  public draw(args: GameStateEvent) {
    this.wrapper.fillSquareFull(0, 0, this.outputSquareWidth, { lineWidth: 2, fillStyle: this.engine.isGameOver ? "rgba(255, 0, 0, .5)" : "rgba(255, 255, 255, .5)" });
    const snakeSquares = args.engine.snake.filledNodes;
    const snakeSegmentPoints = args.engine.snake.segmentPoints;
    SnakeEngine.debugLevel.print(DebugLevel.LOG, "Drawn nodes (%s): %o", snakeSquares.length, snakeSquares);

    this.wrapper.autoSave = true;
    this.wrapper.autoRestore = false;
    this.wrapper.strokeSquareFull(0, 0, this.outputSquareWidth, { lineWidth: 2, strokeStyle: "black" });
    this.wrapper.autoSave = this.wrapper.autoRestore = true;

    for (let i = 0, offsetWidth = 0; i < this.engine.playfieldRect.width; i++, offsetWidth = i * this.renderedCellWidth) {
      for (let j = 0, offsetHeight = 0; j < this.engine.playfieldRect.height; j++, offsetHeight = j * this.renderedCellWidth) {
        // #region Render background tiles
        const tileType = this.getTileType(i, j);
        let backgroundDrawn = false;

        switch (tileType) {
        case "border":
        case "corner":
          backgroundDrawn = this.drawRotatedTile(tileType, offsetWidth, offsetHeight, this.getRotationAngle(i, j, tileType));
          break;
        case "tile":
          backgroundDrawn = SnakeImage.tryDrawImage(this.ctx, "bgTile", offsetWidth, offsetHeight, { x: this.renderedCellWidth, y: this.renderedCellWidth });
          break;
        }

        // Fallback to grid lines if background assets fail to load
        if (!backgroundDrawn) {
          this.wrapper.strokeSquareFull(offsetWidth, offsetHeight, this.renderedCellWidth, { fillStyle: "rgba(255, 255, 255, .5)" });
        }
        // #endregion Render background tiles

        // #region Render snake and pellets
        if (snakeSquares.find(e => e.x === i && e.y === j)) {
          const isHead = this.engine.snake.head.equals({ x: i, y: j });
          const isSegment = snakeSegmentPoints.some(e => e.equals({ x: i, y: j }));

          // Try to draw with assets first, fall back to colored squares
          let imageDrawn = false;
          if (isHead) {
            // Rotate the snake head based on current direction
            const headAngle = this.getSnakeHeadRotationAngle();
            imageDrawn = this.drawRotatedTile("head", offsetWidth, offsetHeight, headAngle);
          } else {
            imageDrawn = SnakeImage.tryDrawImage(this.ctx, "body", offsetWidth, offsetHeight, { x: this.renderedCellWidth, y: this.renderedCellWidth });
          }

          // Fall back to colored squares if images didn't load
          if (!imageDrawn) {
            this.wrapper.fillSquareFull(offsetWidth, offsetHeight, this.renderedCellWidth, { lineWidth: 2, fillStyle: isHead
              ? "red"
              : (isSegment ? "blue" : "green") });
          }
        } else if (this.engine.currPellets.find(e => e.equals({ x: i, y: j }))) {
          if (!SnakeImage.tryDrawImage(this.ctx, "pellet", offsetWidth, offsetHeight, { x: this.renderedCellWidth, y: this.renderedCellWidth }))
            this.wrapper.fillSquareFull(offsetWidth, offsetHeight, this.renderedCellWidth, { lineWidth: 2, fillStyle: "yellow" });
        }
        // #endregion Render snake and pellets
      }
    }
    if (this.engine.isGameOver) this.wrapper.fillSquareFull(0, 0, this.outputSquareWidth, { lineWidth: 2, fillStyle: "rgba(255, 0, 0, .5)" });
    this.wrapper.restore();
    this.wrapper.autoSave = this.wrapper.autoRestore = false;
  }

  public drawGrid() {
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
