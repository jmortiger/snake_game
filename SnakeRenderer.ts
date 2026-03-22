import { DebugLevel } from "./DebugLevel";
import type { GameStateEvent } from "./Events";
import { InputDisplay, TouchInputHandler } from "./InputHandler";
import { RectInt2d, Direction2d } from "./Point2d";
import { SnakeEngine } from "./SnakeEngine";
import { SnakeImage, type ImageParams } from "./SnakeImage";
import { EngineConfig, type IEngineConfig } from "./Types";

interface RenderConfig {
  get assets(): ImageParams[] | undefined;
  /** Rotate a border asset, or just draw a manual border? */
  get rotateBorders(): boolean | undefined;
  get makeOverlay(): boolean | undefined;
};

class SnakeRenderer {
  public static readonly DEBUG_LEVEL = DebugLevel.INFO;
  private get _dbgLvl() { return SnakeRenderer.DEBUG_LEVEL; }
  public static readonly defaultConfig: RenderConfig = {
    assets: [
      { identifier: "head", url: "assets/head.svg" },
      { identifier: "body", url: "assets/body.svg" },
      { identifier: "pellet", url: "assets/pelletCentered.svg" },
      { identifier: "bgTile", url: "assets/bgTile.png" },
      { identifier: "corner", url: "assets/bgCornerTopLeft.png" },
      { identifier: "border", url: "assets/bgBorderLeft.png" },
      { identifier: "background", url: "assets/scale.svg" },
    ],
    rotateBorders: true,
    makeOverlay:   false,
  };

  public readonly engine:  SnakeEngine;
  public readonly wrapper: CtxWrapper;
  public get canvas() { return this.ctx.canvas; }
  public get outputSquareWidth() {
    return this.canvas.width <= this.canvas.height
      ? this.canvas.width
      : this.canvas.height;
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

  public readonly assetPromise?:        Promise<SnakeImage[]>;
  public readonly inputDisplayManager?: InputDisplay<HTMLElement>;
  public constructor(
    public readonly ctx: CanvasRenderingContext2D,
    public readonly config: IEngineConfig = EngineConfig.defaultConfig,
    public readonly renderConfig: RenderConfig = SnakeRenderer.defaultConfig,
  ) {
    const touchControls = document.querySelector("#touch-container");
    if (touchControls) {
      const inputHandler = new TouchInputHandler({
        up:    touchControls.querySelector<HTMLElement>("#up")!,
        down:  touchControls.querySelector<HTMLElement>("#down")!,
        left:  touchControls.querySelector<HTMLElement>("#left")!,
        right: touchControls.querySelector<HTMLElement>("#right")!,
      });
      this.engine = new SnakeEngine(config, inputHandler);
      this.inputDisplayManager = InputDisplay.fromTouchInputHandler(inputHandler);
      const t = DebugLevel.stringify;
      DebugLevel.stringify = false;
      this._dbgLvl.print(DebugLevel.INFO, "Hooked up input display: %o", inputHandler.inputElements);
      DebugLevel.stringify = t;
    } else {
      this.engine = new SnakeEngine(config);
    }
    this.wrapper = new CtxWrapper(this.ctx);
    this.assetPromise = renderConfig.assets
      ? SnakeImage.loadImages(...renderConfig.assets)
      : undefined;
  }

  private _wasInitialized = false;
  public async initGame() {
    // Wait for all assets to load before initializing the game
    await this.assetPromise;
    // Only do this if we're reinitializing.
    if (this._wasInitialized) this.engine.initGame();
    this.engine.onTickCompleted.add(e => this.draw(e));
    this.engine.onGameLost.add(_e => this.endGame(false));
    this.engine.onGameWon.add(_e => this.endGame(true));
    this.engine.onGamePaused.add(_e => this.renderPausedOverlay());
    document.addEventListener("keypress", (e: KeyboardEvent) => {
      if (e.key === "p") {
        if (this.engine.isGamePaused) {
          this.engine.resumeGame();
        } else {
          this.engine.pauseGame();
        }
      }
    });
    this._wasInitialized = true;
  }

  public startGame() {
    this.engine.startGame();
    this.draw({ engine: this.engine });
  }

  public endGame(won: boolean) {
    alert(`Game over: ${won ? "You Won!" : "Sorry, you lost!"}`);
  }

  private renderPausedOverlay() {
    this.wrapper.fillSquareFull(0, 0, this.outputSquareWidth, { lineWidth: 2, fillStyle: "rgba(0, 0, 0, .5)" });
  }

  // #region Rotation Helpers
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
  // #endregion Rotation Helpers

  private get bgFillColor() {
    if (this.engine.isGameOver) {
      if (this.engine.isGameWon) {
        return "rgba(0, 255, 0, .5)";
      }
      return "rgba(255, 0, 0, .5)";
    }
    return "rgb(50, 88, 146)";
  }

  public draw(args: GameStateEvent) {
    // Fill with base background color first
    this.wrapper.fillSquareFull(0, 0, this.outputSquareWidth, { lineWidth: 2, fillStyle: this.bgFillColor });

    // Draw repeating background pattern if available
    const backgroundImg = SnakeImage.getImage("background");
    if (backgroundImg && backgroundImg.isLoaded) {
      const pattern = this.ctx.createPattern(backgroundImg.image, "repeat");
      if (pattern) {
        this.ctx.save();
        this.ctx.fillStyle = pattern;
        this.ctx.fillRect(0, 0, this.outputSquareWidth, this.outputSquareWidth);
        this.ctx.restore();
      }
    }

    const snakeSquares = args.engine.snake.filledNodes;
    const snakeSegmentPoints = args.engine.snake.segmentPoints;
    SnakeRenderer.DEBUG_LEVEL.print(DebugLevel.LOG, "Drawn nodes (%s): %o", snakeSquares.length, snakeSquares);

    this.wrapper.autoSave = this.wrapper.autoRestore = true;

    for (let i = 0, offsetWidth = 0; i < this.engine.playfieldRect.width; i++, offsetWidth = i * this.renderedCellWidth) {
      for (let j = 0, offsetHeight = 0; j < this.engine.playfieldRect.height; j++, offsetHeight = j * this.renderedCellWidth) {
        // #region Render background tiles
        let backgroundDrawn = false;
        if (this.renderConfig.rotateBorders) {
          const tileType = this.getTileType(i, j);

          switch (tileType) {
          case "border":
          case "corner":
            backgroundDrawn = this.drawRotatedTile(tileType, offsetWidth, offsetHeight, this.getRotationAngle(i, j, tileType));
            break;
          default: // case "tile":
            backgroundDrawn = SnakeImage.tryDrawImage(this.ctx, "bgTile", offsetWidth, offsetHeight, { x: this.renderedCellWidth, y: this.renderedCellWidth });
            break;
          }
        } else {
          backgroundDrawn = SnakeImage.tryDrawImage(this.ctx, "bgTile", offsetWidth, offsetHeight, { x: this.renderedCellWidth, y: this.renderedCellWidth });
        }

        // Fallback to grid lines if background assets fail to load
        if (!backgroundDrawn) {
          this.wrapper.strokeSquareFull(offsetWidth, offsetHeight, this.renderedCellWidth, { fillStyle: "rgba(255, 255, 255, .5)" });
        }
        // #endregion Render background tiles

        // #region Render foreground elements
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
          // NOTE: Nullish check stops race condition(?) bug on state change
        } else if (this.engine.currPellets.find(e => e?.equals({ x: i, y: j }))) {
          if (!SnakeImage.tryDrawImage(this.ctx, "pellet", offsetWidth, offsetHeight, { x: this.renderedCellWidth, y: this.renderedCellWidth }))
            this.wrapper.fillSquareFull(offsetWidth, offsetHeight, this.renderedCellWidth, { lineWidth: 2, fillStyle: "yellow" });
          // NOTE: Nullish check stops race condition(?) bug on state change
        } else if (this.engine.currObstacles.find(e => e?.equals({ x: i, y: j }))) {
          if (!SnakeImage.tryDrawImage(this.ctx, "wall", offsetWidth, offsetHeight, { x: this.renderedCellWidth, y: this.renderedCellWidth }))
            this.wrapper.fillSquareFull(offsetWidth, offsetHeight, this.renderedCellWidth, { lineWidth: 2, fillStyle: "black" });
        }
        // #endregion Render foreground elements
      }
    }
    if (this.renderConfig.makeOverlay && this.engine.isGameOver) this.wrapper.fillSquareFull(0, 0, this.outputSquareWidth, { lineWidth: 2, fillStyle: this.bgFillColor });
    if (!this.renderConfig.rotateBorders)
      this.wrapper.strokeSquareFull(0, 0, this.outputSquareWidth, { lineWidth: 2, strokeStyle: "black" });
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

type CtxRectOptions = {
  fillStyle?:   string;
  strokeStyle?: string;
  lineWidth?:   number;
};

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
    this.onSave();
    CtxWrapper.strokeRectFull(this.ctx, x, y, width, height, options, this);
    this.onRestore();
  }

  public strokeSquareFull(
    x: number,
    y: number,
    width: number,
    options: CtxRectOptions = {},
  ) {
    this.onSave();
    CtxWrapper.strokeSquareFull(this.ctx, x, y, width, options, this);
    this.onRestore();
  }

  public fillSquareFull(
    x: number,
    y: number,
    width: number,
    options: CtxRectOptions = {},
  ) {
    this.onSave();
    CtxWrapper.fillSquareFull(this.ctx, x, y, width, options, this);
    this.onRestore();
  }
  // #endregion Instance
}

export default SnakeRenderer;

export type {
  RenderConfig,
};
