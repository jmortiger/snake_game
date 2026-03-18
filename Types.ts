import { DEBUG, DebugLevel, INFO, LOG, WARN } from "./DebugLevel";
import { html } from "./HtmlTemplate";
import { Direction, Point, RectInt, type IPoint } from "./Point2d";
import Snake from "./Snake";

/**
 * Defines how the snake reacts when moving into the bounds of the play area.
 */
enum WallBehavior {
  endGame,
  /**
   * TODO: Implement
   */
  wrap,
}
/**
 * Defines how the snake died.
 */
enum CauseOfDeath {
  selfCollision,
  wallCollision,
}

interface INodeConfig {
  get direction(): Direction;
  get count(): number;
  get nodes(): Point[];
}
class PreMadeNodeConfig implements INodeConfig {
  constructor(public nodes: Point[]) {}
  get direction(): Direction { return Direction.fromCardinalDisplacement(this.nodes[1]!, this.nodes[0]!)!; }
  get count(): number { return this.nodes.length; }
}
class ParameterizedNodeConfig implements INodeConfig {
  public direction: Direction;
  public nodes:     Point[];
  constructor(public count: number, validNodes: IPoint[], _direction?: Direction) {
    this.nodes = NodeGeneration.generateFromValidNodes(count, validNodes, _direction).nodes;
    this.direction = _direction || Direction.fromCardinalDisplacement(this.nodes[1]!, this.nodes[0]!)!;
  }
}
interface ISnakeConfig {
  wallBehavior:       WallBehavior;
  startingLength:     number;
  /**
   * @todo REMOVE
   * @deprecated
   */
  startingDirection?: Direction;
  startingNodes?:     Point[];
};
interface IGridObjectConfig {
  startingObjs: number | IPoint[];
  maxObjs:      number;
}
interface IEngineConfig extends ISnakeConfig {
  gridWidth:             number;
  gridHeight:            number;
  pelletConfig:          IGridObjectConfig;
  obstacleConfig:        IGridObjectConfig;
  millisecondsPerUpdate: number;
};
type _CfgPromiseConfig  = { form: HTMLFormElement; promise?: Promise<IEngineConfig>; defaults: IEngineConfig };
type _CfgPromiseObjFull = { form: HTMLFormElement; promise: Promise<IEngineConfig>; defaults: IEngineConfig };
class EngineConfig implements IEngineConfig {
  public constructor(
    public gridWidth: number,
    public gridHeight: number,
    public pelletConfig: IGridObjectConfig,
    public obstacleConfig: IGridObjectConfig,
    public millisecondsPerUpdate: number,
    public wallBehavior: WallBehavior,
    public startingLength: number,
    public startingDirection?: Direction,
    public startingNodes?: Point[],
  ) {}

  public static fromObj(i: IEngineConfig) {
    return new EngineConfig(
      i.gridWidth,
      i.gridHeight,
      i.pelletConfig,
      i.obstacleConfig,
      i.millisecondsPerUpdate,
      i.wallBehavior,
      i.startingLength,
      i.startingDirection,
      i.startingNodes,
    );
  }

  /** An editable version of the default config. */
  public static get defaults(): IEngineConfig {
    return {
      gridWidth:             10,
      gridHeight:            10,
      startingDirection:     Direction.up,
      startingLength:        5,
      wallBehavior:          WallBehavior.endGame,
      pelletConfig:          { startingObjs: 1, maxObjs: 1 },
      obstacleConfig:        { startingObjs: 0, maxObjs: 0 },
      millisecondsPerUpdate: 1000 * 0.45, // 0.5,
      startingNodes:         undefined,
    };
  };

  public static readonly defaultConfig: Readonly<IEngineConfig> = Object.freeze(this.defaults);

  public static isValidConfig(c: IEngineConfig): boolean {
    return this.hasValidDimensions(c)
      && (c.startingLength || 0) > 2
      && c.startingLength < NodeGeneration.MAX_GENERATED_LENGTH

      && this.hasValidObstacleConfig(c)

      && this.hasValidPelletConfig(c)

      && (c.startingLength + c.pelletConfig.maxObjs + c.obstacleConfig.maxObjs) <= (c.gridWidth * c.gridHeight)
      && c.millisecondsPerUpdate > 0
      && (!c.startingNodes || (
        c.startingNodes.length === c.startingLength
        && (!c.startingDirection || (c.startingDirection === Direction.fromCardinalDisplacement(c.startingNodes[1]!, c.startingNodes[0]!)))
      ));
  }

  public static hasValidDimensions(c: IEngineConfig) {
    return Number.isSafeInteger(c.gridWidth)
      && Number.isSafeInteger(c.gridHeight)
      && c.gridWidth > 2
      && c.gridHeight > 2;
  }

  private static hasValidIGridObjectConfig(c: IGridObjectConfig, minObjs: number, maxFreeSpaces?: number) {
    return c.maxObjs >= minObjs
      && c.maxObjs >= (c.startingObjs instanceof Array ? c.startingObjs.length : c.startingObjs)
      && (c.startingObjs instanceof Array ? c.startingObjs.length : c.startingObjs) >= 0
      && (!maxFreeSpaces || c.maxObjs < maxFreeSpaces);
  }

  /**
   * Assumes `hasValidDimensions`.
   * @param c
   * @returns
   * @see EngineConfig.hasValidDimensions
   */
  public static hasValidPelletConfig(c: IEngineConfig) {
    return this.hasValidIGridObjectConfig(c.pelletConfig, 1, c.gridWidth * c.gridHeight - c.startingLength);
  }

  /**
   * Assumes `hasValidDimensions`.
   * @param c
   * @returns
   * @see EngineConfig.hasValidDimensions
   */
  public static hasValidObstacleConfig(c: IEngineConfig) {
    return this.hasValidIGridObjectConfig(c.obstacleConfig, 0, c.gridWidth * c.gridHeight - c.startingLength);
  }

  /**
   * Calls
   * @param c
   * @returns
   */
  public static hasValidSnakeConfig(c: IEngineConfig) {
    return (c.startingLength || 0) > 2
      && c.startingLength < NodeGeneration.MAX_GENERATED_LENGTH;
  }

  // #region UI
  // #region Construct from UI
  // #region Helpers
  private static inputType(element: HTMLElement) {
    if (element instanceof HTMLInputElement) {
      switch (element.type) {
      case "number":
      case "range":
        return "number";

      case "text":
      case "url":
        return "string";

      case "radio":
        return "enum";

      default:
        return "undefined";
      }
    }
    if (element instanceof HTMLTextAreaElement)
      return "string";
    return "undefined";
  }

  private static inputTypeSpecific(element: HTMLElement) {
    const v = this.inputType(element);
    if (v !== "enum") return v;
    return element.dataset["enum"];
  }
  // #endregion Helpers

  public static fromFormAndData(form: HTMLFormElement, data: FormData, defaults = this.defaultConfig) {
    const rv: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    data.forEach((value, key) => {
      let actingObj = rv, actingKey = key;
      if (key.includes(".")) {
        const keys = key.split(".");
        for (let i = 0; i < keys.length - 1; actingObj = actingObj[keys[i++]!]) {
          actingObj[keys[i]!] ||= {};
        }
        actingKey = keys.at(-1)!;
      }
      let parsedValue: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const element = form.querySelector<HTMLElement>(`[name=${CSS.escape(key)}]${form.querySelector<HTMLInputElement>(`input[name=${CSS.escape(key)}][type=radio]`) ? `[value=${CSS.escape(value.toString())}]` : ""}`)!, iType = this.inputType(element);
      switch (iType) {
      case "number":
        parsedValue = Number(value);
        break;
      case "enum":
        switch (this.inputTypeSpecific(element)) {
        case "WallBehavior":
          parsedValue = (value.toString().includes("wrap") || value.valueOf() == WallBehavior.wrap.valueOf()) ? WallBehavior.wrap : WallBehavior.endGame;
          break;

        case "string":
        default:
          parsedValue = value;
          break;
        }
        break;

      case "string":
      default:
        parsedValue = value;
        break;
      }
      actingObj[actingKey] = parsedValue;
    });
    // TODO: Handle unchecked checkboxes (maybe w/ `form.elements` & `data.has`)?
    return Object.assign({}, defaults, rv) as IEngineConfig;
  }

  public static fromFormDataEvent(e: FormDataEvent, defaults = this.defaultConfig) {
    if (!(e.target instanceof HTMLFormElement)) {
      console.warn("`FormDataEvent.target` is not an instance of `HTMLFormElement`");
      return this.defaultConfig;
    }
    return this.fromFormAndData(e.target, e.formData, defaults);
  }

  public static fromSubmitEvent(e: SubmitEvent, defaults = this.defaultConfig) {
    if (!(e.target instanceof HTMLFormElement)) {
      console.warn("`FormDataEvent.target` is not an instance of `HTMLFormElement`");
      return this.defaultConfig;
    }
    return this.fromFormAndData(e.target, new FormData(e.target, e.submitter), defaults);
  }
  // #endregion Construct from UI

  private static refreshOnResolution(obj: _CfgPromiseConfig, onParsed?: (cfg: IEngineConfig) => void) {
    const cb: (v: IEngineConfig) => void = (v) => {
      obj.defaults = v;
      obj.promise = this.createPromise(obj.form, obj.defaults, cb, onParsed);
    };
    obj.promise = this.createPromise(obj.form, obj.defaults, cb, onParsed);
    return obj as _CfgPromiseObjFull;
  }

  private static createPromise(form: HTMLFormElement, defaults?: IEngineConfig, preResolution?: (v: IEngineConfig) => void, postResolution?: (v: IEngineConfig) => void) {
    return new Promise<IEngineConfig>((resolve, _reject) => {
      const listener: (this: HTMLFormElement, e: SubmitEvent) => void = (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();

        // TODO: Validation
        const newCfg = this.fromSubmitEvent(e, defaults) as IEngineConfig;
        preResolution?.call(this, newCfg);
        resolve(newCfg);
        postResolution?.call(this, newCfg);
        form.removeEventListener("submit", listener);
      };
      form.addEventListener("submit", listener);
    });
  }

  public static toUI(c: IEngineConfig, onParsed?: (cfg: IEngineConfig) => void): _CfgPromiseObjFull {
    const elem = html<HTMLFormElement>`
    <form id="snake-settings" style="display: inline-flex; flex-direction: column;">
      <label>Grid Width: <input type=number value=${c.gridWidth} name="gridWidth" /></label>
      <label>Grid Height: <input type=number value=${c.gridHeight} name="gridHeight" /></label>
      <label>Tick rate: <input type=number value=${c.millisecondsPerUpdate} name="millisecondsPerUpdate" /> milliseconds per update</label>
      <fieldset>
        <legend>Going off-screen:</legend>
        <label><input type=radio value=${WallBehavior.endGame}${c.wallBehavior === WallBehavior.endGame ? " checked" : ""} name=wallBehavior data-enum=WallBehavior /> is a game over</label>
        <label><input type=radio value=${WallBehavior.wrap}${c.wallBehavior === WallBehavior.wrap ? " checked" : ""} name=wallBehavior data-enum=WallBehavior /> wraps around to the other side</label>
      </fieldset>
      <fieldset>
        <legend>Pellets</legend>
        <label>Starting: <input type=number value=${c.pelletConfig.startingObjs} name=pelletConfig.startingObjs /></label>
        <label>Max: <input type=number value=${c.pelletConfig.maxObjs} name=pelletConfig.maxObjs /></label>
      </fieldset>
      <fieldset>
        <legend>Obstacles</legend>
        <label>Starting: <input type=number value=${c.obstacleConfig.startingObjs} name=obstacleConfig.startingObjs /></label>
        <label>Max: <input type=number value=${c.obstacleConfig.maxObjs} name=obstacleConfig.maxObjs /></label>
      </fieldset>
      <input type="submit" value="Start a new game with chosen settings" />
    </form>
    `;

    return this.refreshOnResolution({ form: elem, defaults: c }, onParsed);
  }
  // #endregion UI
};

function randomIndex(a: Readonly<Array<unknown>>) {
  return Math.floor(a.length * Math.random());
}

function removeFromIndex<T>(a: T[], i: number): T {
  return a.splice(i, 1)[0] as T;
}

function removeRandom<T>(a: T[]): T {
  return a.splice(Math.floor(a.length * Math.random()), 1)[0] as T;
}

type GenerationOutput = { success: boolean; nodes: Point[]; validNodes: IPoint[] };
class NodeGeneration {
  public static DEBUG_LEVEL = DebugLevel.INFO;
  private static findValidNeighborIndices(node: Readonly<IPoint>, validNodes: Readonly<IPoint[]>) {
    return Direction.directions
      .reduce((accumulator, direction) => {
        // const t = validNodes.findIndex(e => Point.add(node, c).equals(e));
        const neighbor = Point.add(node, direction), t = validNodes.findIndex(e => neighbor.equals(e));
        if (t !== -1) accumulator.push(t);
        return accumulator;
      }, [] as number[]);
  }

  private static generateFacingDirection(
    // nodes: Point[],
    validNodes: IPoint[],
    desiredLength: number,
    direction: Direction,
  ) {
    const newDesiredLength = desiredLength/*  - 2 */;
    const starts = validNodes.reduce<{ nodes: Point[]; validNodes: IPoint[] }[]>((acc, potentialHead, i) => {
      const secondNodeIndex = validNodes.findIndex(e => Point.equals(Point.subtract(potentialHead, direction), e));
      if (secondNodeIndex >= 0) {
        const [i1, i2] = i < secondNodeIndex ? [i, secondNodeIndex] : [secondNodeIndex, i];
        acc.push({
          nodes:      [Point.fromIPoint2d(potentialHead), Point.fromIPoint2d(validNodes[secondNodeIndex]!)],
          validNodes: validNodes.slice(0, i1).concat(validNodes.slice(i1 + 1, i2), validNodes.slice(i2 + 1)),
        });
      }
      return acc;
    }, []);
    let rv: GenerationOutput, best: GenerationOutput | undefined;
    do {
      const args = starts.splice(randomIndex(starts), 1)[0]!;
      rv = this.depthFirst(args.nodes, args.validNodes, newDesiredLength);
      if (!best || rv.success || rv.nodes.length > rv.nodes.length) best = rv;
    } while (!rv.success && starts.length > 0);
    return rv;
  }

  public static generateFromValidNodes(desiredLength: number, validNodes: IPoint[], startingDirection?: Direction) {
    if (startingDirection) return this.generateFacingDirection(validNodes, desiredLength, startingDirection);
    else return this.depthFirst([], validNodes, desiredLength);
  }

  public static generateFromPlayfield(desiredLength: number, playfield: RectInt, claimedNodes?: IPoint[], startingDirection?: Direction) {
    this.depthFirst_playfield = playfield;
    const rv = this.generateFromValidNodes(desiredLength, this.getInitialValidNodes(playfield, claimedNodes), startingDirection);
    this.depthFirst_playfield = undefined;
    return rv;
  }

  public static generateFromSnakeConfig(config: ISnakeConfig, playfield: RectInt, claimedNodes?: IPoint[]) {
    return this.generateFromPlayfield(config.startingLength, playfield, claimedNodes, config.startingDirection);
  }

  public static generateFromEngineConfig(config: IEngineConfig) {
    const claimedNodes: IPoint[] = [];
    if (typeof config.obstacleConfig.startingObjs === "object") claimedNodes.concat(config.obstacleConfig.startingObjs);
    if (typeof config.pelletConfig.startingObjs === "object") claimedNodes.concat(config.pelletConfig.startingObjs);
    return this.generateFromSnakeConfig(
      config,
      RectInt.fromDimensionsAndMin(config.gridWidth, config.gridHeight),
      claimedNodes,
    );
  }

  /**
   * This uses a simple depth-first search for generation that gets problematic
   * past a point, so we're limiting it to this long.
   */
  public static readonly MAX_GENERATED_LENGTH = 75;
  private static depthFirst_iterations = 0;
  private static depthFirst_maxLength = 0;
  private static depthFirst_playfield: RectInt | undefined;
  private static depthFirst_iterationLimit = 100000;
  private static depthFirst_depth = 0;
  /**
   * TODO: Add `initialValidOptions` for heuristics?
   * TODO: Add conditions for head node (has space)?
   * TODO: Change `nodes` to `startNode`?
   * TODO: Change `desiredLength` to `numNodesToAdd`?
   * TODO: Add profiling?
   * @param nodes
   * @param validNodes
   * @param desiredLength
   * @returns
   */
  private static depthFirst(
    nodes: Point[],
    validNodes: IPoint[],
    desiredLength: number,
  ): GenerationOutput {
    this.depthFirst_depth++;
    this.depthFirst_iterations++;
    this.DEBUG_LEVEL.do(
      LOG,
      (print) => {
        let css = "";
        if (nodes.length > this.depthFirst_maxLength) {
          this.depthFirst_maxLength = nodes.length;
          css = "color: green; text-decoration: underline;";
        }
        print("depthFirst(%s nodes, %s validNodes, desiredLength: %s)\n\titerations: %s\n%c\tmax: %s", nodes.length, validNodes.length, desiredLength, this.depthFirst_iterations, css, this.depthFirst_maxLength);
      },
    );
    if (nodes.length === desiredLength) {
      this.DEBUG_LEVEL.do(INFO, (print) => {
        print("SUCCESS at %s iterations", this.depthFirst_iterations);
        this.depthFirst_iterations = this.depthFirst_maxLength = 0;
      });
      this.depthFirst_depth--;
      return { success: true, nodes: nodes, validNodes: validNodes };
    }
    if (this.depthFirst_iterations >= this.depthFirst_iterationLimit) {
      this.DEBUG_LEVEL.do(WARN, (print) => {
        print("FAILURE: Exceeded cap of %s iterations (%s)", this.depthFirst_iterationLimit, this.depthFirst_iterations);
        /* this.depthFirst_iterations =  */this.depthFirst_maxLength = 0;
      });
      this.DEBUG_LEVEL.debugger(DEBUG);
      this.depthFirst_depth--;
      return { success: false, nodes: nodes, validNodes: validNodes };
    }
    /* if (nodes.length < 1) {
      const nodeIndex = randomIndex(validNodes);
      // this.DEBUG_LEVEL.print(DEBUG, "Adding starting node at %s", validNodes[nodeIndex]);
      // TODO: Put in a loop.
      this.depthFirst_depth--;
      return this.depthFirst([Point.fromIPoint2d(validNodes[nodeIndex]!)], validNodes.slice(0, nodeIndex).concat(validNodes.slice(nodeIndex + 1)), desiredLength);
    } */
    const options = nodes.length < 1
      ? Array.from(validNodes.keys())
      : this.findValidNeighborIndices(nodes.at(-1)!, validNodes);
    if (options.length < 1) {
      this.DEBUG_LEVEL.do(INFO, (print) => {
        print("FAILED: No options");
        if (this.depthFirst_playfield) DebugLevel.tableFromPointsAndPlayfield(nodes, this.depthFirst_playfield);
      });
      this.depthFirst_depth--;
      return { success: false, nodes: nodes, validNodes: validNodes };
    }
    // this.DEBUG_LEVEL.print(DEBUG, "%s options", options.length);
    do {
      // this.DEBUG_LEVEL.print(DEBUG, "Option %s", i);
      // Randomize the selection to stop march towards upper-left & prevent always returning to a dead-end path
      const nodeIndex = options.splice(randomIndex(options), 1)[0]!,
            node = validNodes[nodeIndex]!,
            vnCopy = validNodes.slice(0, nodeIndex).concat(validNodes.slice(nodeIndex + 1)),
            result = this.depthFirst(nodes.concat([Point.fromIPoint2d(node)]), vnCopy, desiredLength);
      if (result.success) { this.depthFirst_depth--; return result; }
      // TODO: Analyze failed path for heuristics?
    } while (options.length > 0 && this.depthFirst_iterations < this.depthFirst_iterationLimit);
    // this.DEBUG_LEVEL.print(DEBUG, "FAILED: All options failed");
    if (--this.depthFirst_depth === 0) this.depthFirst_iterations = 0;
    return { success: false, nodes: nodes, validNodes: validNodes };
  }

  private static readonly ALLOW_STARTING_NODES_ON_PERIMETER = true;
  private static isOnPerimeter(e: IPoint, playfield: RectInt) {
    return e.x > playfield.xMin && e.x < playfield.xMax - 1 && e.y > playfield.yMin && e.y < playfield.yMax - 1;
  }

  private static getInitialValidNodes(playfield: RectInt, claimedNodes?: IPoint[]) {
    if (this.ALLOW_STARTING_NODES_ON_PERIMETER) {
      if (claimedNodes) {
        return playfield.generatePointsWhere(e => !Point.included(e, claimedNodes));
      } else {
        return playfield.points;
      }
    } else {
      return playfield
        .generatePointsWhere(claimedNodes
          ? e => this.isOnPerimeter(e, playfield) && !Point.included(e, claimedNodes)
          : e => this.isOnPerimeter(e, playfield));
    }
  }

  public static removeSurplusNodes(nodes: Point[]) {
    for (let i = 1; i < nodes.length - 1; i++) {
      if (nodes[i + 1]!.matchingAxes(nodes[i]!)[0] == nodes[i]!.matchingAxes(nodes[i - 1]!)[0]) {
        this.DEBUG_LEVEL.print(LOG, "Removing redundant segment");
        nodes.splice(i, 1);
      }
    }
    return nodes;
  }
}

export type { IEngineConfig, ISnakeConfig, GenerationOutput, IGridObjectConfig };
export {
  EngineConfig,
  WallBehavior,
  CauseOfDeath,
  randomIndex,
  removeFromIndex,
  removeRandom,
  NodeGeneration,
};
