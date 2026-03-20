import type { Point } from "./Point2d";
import type { SnakeEngine } from "./SnakeEngine";

type SnakeDelegate<EventArgs> = (args: EventArgs) => void;
class SnakeEvent<A> {
  constructor(
    private readonly listeners: SnakeDelegate<A>[] = [],
    private readonly onAdd?: (cb: SnakeDelegate<A>, event: SnakeEvent<A>) => void,
    private readonly onRemove?: (cb: SnakeDelegate<A>, event: SnakeEvent<A>) => void,
  ) {}

  public fire(args: A) {
    this.listeners.forEach(f => f(args));
  }

  /** @todo Add `tag` to distinguish who added what for resetting */
  public add(...funcs: SnakeDelegate<A>[]) {
    for (const func of funcs) {
      this.listeners.push(func);
      if (this.onAdd) this.onAdd(func, this);
    }
  }

  public remove(func: SnakeDelegate<A>) {
    const i = this.listeners.indexOf(func);
    if (i < 0) return false;
    const removed = this.listeners.splice(i, 1)[0]!;
    if (this.onRemove) this.onRemove(removed, this);
    return true;
  }

  /**
   *
   * @param func
   * @returns The number of removed instances of `func`; will be a falsy `0` if none were found.
   */
  public removeEvery(func: SnakeDelegate<A>) {
    let count = 0;
    for (let i = this.listeners.indexOf(func); i >= 0; i = this.listeners.indexOf(func), count++) {
      const removed = this.listeners.splice(i, 1)[0]!;
      if (this.onRemove) this.onRemove(removed, this);
    }
    return count;
  }

  public clear() {
    const cbs = this.listeners.splice(0);
    if (this.onRemove) cbs.forEach(e => this.onRemove!(e, this));
    return cbs;
  }
}

interface GameStateEvent {
  engine: SnakeEngine;
}
interface TickEvent extends GameStateEvent {
  tickCount: number;
}
interface GameOverEvent extends GameStateEvent {
  reason: "lost" | "won" | "other";
}
interface GameLostEvent extends GameOverEvent {
  collision: Point[] | Point;
}
interface PelletEatenEvent extends GameStateEvent {
  /** The length of the snake after the pellet has been eaten. */
  snakeLength:       number;
  pelletCoordinates: Point;
  newPellets?:       Point[];
  totalEaten:        number;
  movesSinceLast:    number;
}

export {
  SnakeEvent,
};
export type {
  SnakeDelegate,
  GameStateEvent,
  GameOverEvent,
  GameLostEvent,
  PelletEatenEvent,
  TickEvent,
};
