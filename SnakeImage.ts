import { RectInt, type IPoint2d } from "./Point2d";

class SnakeImage {
  private static readonly imgMap = new Map<string, SnakeImage>();
  private _isLoaded = false;
  public get isLoaded() { return this._isLoaded; }
  private readonly _promise: Promise<SnakeImage>;
  public get promise() { return this._promise; }

  public readonly image: HTMLImageElement;
  private constructor(
    public readonly identifier: string,
    public readonly url: string,
    public readonly sourceRect?: RectInt,
  ) {
    this.image = new Image();
    this._promise = new Promise<SnakeImage>((resolve, _reject) => {
      this.image.addEventListener("load", (e) => {
        this.onLoad(e);
        resolve(this);
      });
      this.image.src = url;
    });
    SnakeImage.imgMap.set(this.identifier, this);
  }

  public static promiseFromRect(
    identifier: string,
    url: string,
    sourceRect?: RectInt,
  ) { return new SnakeImage(identifier, url, sourceRect).promise; }

  public static promiseFromDimensions(
    identifier: string,
    url: string,
    dimensions?: IPoint2d,
  ) { return new SnakeImage(identifier, url, dimensions ? RectInt.fromDimensionsAndMin(dimensions.x, dimensions.y) : undefined).promise; }

  private onLoad(_e: Event) { this._isLoaded = true; }

  public static tryDrawImage(ctx: CanvasRenderingContext2D, identifier: string, x: number, y: number, dimensions?: IPoint2d) {
    const i = this.imgMap.get(identifier);
    if (i) return i.tryDrawImage(ctx, x, y, dimensions);
    return false;
  }

  public tryDrawImage(ctx: CanvasRenderingContext2D, x: number, y: number, dimensions?: IPoint2d) {
    if (!(this.isLoaded)) return false;
    if (this.sourceRect) {
      ctx.drawImage(
        this.image,
        this.sourceRect.xMin,
        this.sourceRect.yMin,
        this.sourceRect.width,
        this.sourceRect.height,
        x,
        y,
        dimensions === undefined ? this.sourceRect.width : dimensions.x,
        dimensions === undefined ? this.sourceRect.height : dimensions.y,
      );
    } else if (dimensions) {
      ctx.drawImage(
        this.image,
        x,
        y,
        dimensions.x,
        dimensions.y,
      );
    } else {
      ctx.drawImage(
        this.image,
        x,
        y,
      );
    }
    return true;
  }
}

class SnakeAssetPack {
  public readonly promise: Promise<SnakeImage[]>;
  private static toPromise(identifier: string, e: { url: string; dimensions?: RectInt | IPoint2d }) {
    return e.dimensions instanceof RectInt ? SnakeImage.promiseFromRect(identifier, e.url, e.dimensions) : SnakeImage.promiseFromDimensions(identifier, e.url, e.dimensions);
  }

  constructor(
    public readonly head: { url: string; dimensions?: RectInt | IPoint2d },
    public readonly body: { url: string; dimensions?: RectInt | IPoint2d },
    public readonly pellet: { url: string; dimensions?: RectInt | IPoint2d },
    public readonly bgTile: { url: string; dimensions?: RectInt | IPoint2d },
    public readonly corner: { url: string; dimensions?: RectInt | IPoint2d },
    public readonly border: { url: string; dimensions?: RectInt | IPoint2d },
  ) {
    this.promise = Promise.all([
      SnakeAssetPack.toPromise("head", head),
      SnakeAssetPack.toPromise("body", body),
      SnakeAssetPack.toPromise("pellet", pellet),
      SnakeAssetPack.toPromise("bgTile", bgTile),
      SnakeAssetPack.toPromise("corner", corner),
      SnakeAssetPack.toPromise("border", border),
    ]);
  }
}

export {
  SnakeImage,
  SnakeAssetPack,
};
