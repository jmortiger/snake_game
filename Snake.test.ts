import { describe, expect, test } from "bun:test";
import Snake from "./Snake";
import { WallBehavior } from "./Types";
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

test(
  "Array.splice behaves as expected",
  () => {
    const aC = [0, 1, 2, 3];
    const a2 = aC.slice();
    expect(a2.splice(1, 1)).toEqual([1]);
    expect(a2).toEqual([0, 2, 3]);
    expect(a2.splice(1, 0, 1)).toBeEmpty();
    expect(a2).toEqual([0, 1, 2, 3]);
  },
);

describe("Snake.depthFirst", () => {

  test(
    "DIRECT depthFirst TEST",
    () => {
      let pf: RectInt, points: IPoint2d[];
      iterate(
        (i, width, height) => {
          /* Snake.depthFirst_playfield ||=  */pf ||= RectInt.fromDimensionsAndMin(width, height);
          points ||= pf.points;
          console.log(i);
          expect(Snake.depthFirst([], points, i).success).toBeTrue();
        },
        1,
        10,
        10,
      );
    },
  );
});

describe("Snake.fromPreferences makes a snake", () => {
  test(
    "will error when requesting something too long",
    () => {
      // Over max limit
      expect(() => Snake.fromPreferences({ startingLength: Snake.MAX_GENERATED_LENGTH + 1, wallBehavior: WallBehavior.endGame, startingDirection: Direction.up }, RectInt.fromDimensionsAndMin(10, 10))).toThrowError();
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

  /* test(
    "with no repeated nodes",
    () => {
      const width = 10, height = 10;
      for (let i = 2; i < width * height - 10; i++) {
        expect(
          Snake.fromPreferences(
            {
              startingLength: i,
              wallBehavior: WallBehavior.endGame,
              startingDirection: Direction.up,
            },
            RectInt.fromDimensionsAndMin(width, height, { x: 0, y: 0 }),
          ),
        ).toSatisfy(
          s => s
            .snakeNodesDebug
            .every((e, i, a) => [...a].splice(i, 1).every(e1 => !e.equals(e1))),
        );
      }
    },
  ); */
  test(
    "with no repeated nodes",
    () => {
      const width = 10, height = 10;
      // for (let i = 2; i < width * height - 10; i++) {
      for (let i = 2; i < width * height; i += 10) {
        const nodes = Snake.fromPreferences(
          {
            startingLength:    i,
            wallBehavior:      WallBehavior.endGame,
            startingDirection: Direction.up,
          },
          RectInt.fromDimensionsAndMin(width, height, { x: 0, y: 0 }),
        ).snakeNodesDebug;
        for (let j = 0; j < nodes.length; j++) {
          const trim = [...nodes].splice(i, 1);
          trim.forEach(e => expect(e).not.toSatisfy(e1 => (e1 as Point2d).equals(nodes[i])));
        }
        /* expect(
          ,
        ).not.toInclude(
          s => s
            .snakeNodesDebug
            .every((e, i, a) => [...a].splice(i, 1).every(e1 => !e.equals(e1))),
        ); */
      }
    },
  );

  // test(
  //   "of the proper length",
  //   () => {
  //     const width = 10, height = 10;
  //     for (let i = 2; i < width * height - 10; i++) {
  //       expect(
  //         Snake.fromPreferences(
  //           {
  //             startingLength: i,
  //             wallBehavior: WallBehavior.endGame,
  //             startingDirection: Direction.up,
  //           },
  //           RectInt.fromDimensionsAndMin(width, height, { x: 0, y: 0 }),
  //         ),
  //       ).toSatisfy(
  //         s => {
  //           let runningTotal = 0;
  //           s.snakeNodesDebug.reduce(
  //             (p, c, i, a) => p ? c.,
  //           )
  //         },
  //       );
  //     }
  //   },
  // );
});
