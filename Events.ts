import type { Point } from "./Point2d";
import type { SnakeEngine } from "./SnakeEngine";

type SnakeDelegate<EventArgs> = (args: EventArgs) => void;
class SnakeEvent<A> {
  constructor(private readonly listeners: SnakeDelegate<A>[] = []) {}

  public fire(args: A) {
    this.listeners.forEach(f => f(args));
  }

  /** @todo Add `tag` to distinguish who added what for resetting */
  public add(func: SnakeDelegate<A>) {
    this.listeners.push(func);
  }

  public remove(func: SnakeDelegate<A>) {
    const i = this.listeners.indexOf(func);
    if (i < 0) return false;
    this.listeners.splice(i, 1);
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
      this.listeners.splice(i, 1);
    }
    return count;
  }

  public clear() {
    return this.listeners.splice(0);
  }
}

interface GameStateEvent {
  engine: SnakeEngine;
}
interface TickEvent extends GameStateEvent {
  tickCount: number;
}
interface GameOverEvent extends GameStateEvent {
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
  PelletEatenEvent,
  TickEvent,
};
