import { describe, expect, test } from "bun:test";
import Snake from "./Snake";
import { NodeGeneration, WallBehavior } from "./Types";
import { DebugLevel } from "./DebugLevel";
import { Direction, Point2d, RectInt, type IPoint2d } from "./Point2d";

function iterate(
  cb: (i: number, width: number, height: number) => void | boolean,
  step = 10,
  width = 10,
  height = 10,
  start = 2,
  end = width * height,
) {
  for (let i = start; i < end; i += step) {
    if (cb(i, width, height)) break;
  }
}

describe("Snake.fromPreferences makes a snake", () => {
  test(
    "will error when requesting something too long",
    () => {
      // Over max limit
      expect(() => Snake.fromPreferences({ startingLength: NodeGeneration.MAX_GENERATED_LENGTH + 1, wallBehavior: WallBehavior.endGame, startingDirection: Direction.up }, RectInt.fromDimensionsAndMin(10, 10))).toThrowError();
      // TODO: Not enough space
    }
  );
  test(
    "with no diagonal line segments",
    () => {
      iterate(
        (
          i,
          width,
          height,
        ) => {
          expect(
            Snake.fromPreferences(
              {
                startingLength:    i,
                wallBehavior:      WallBehavior.endGame,
                startingDirection: Direction.up,
              },
              RectInt.fromDimensionsAndMin(width, height, { x: 0, y: 0 }),
            ),
          ).toSatisfy(
            s => s
              .snakeNodesDebug
              .every((e, i, a) => i === 0 || (e.matchingAxes(a[i - 1]!).length === 1)),
          );
        },
      );
    },
  );
});
