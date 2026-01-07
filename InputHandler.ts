import { Direction } from "./Point2d";

class InputAction {
  public static readonly up = new InputAction("up", Direction.up);
  public static readonly down = new InputAction("down", Direction.down);
  public static readonly left = new InputAction("left", Direction.left);
  public static readonly right = new InputAction("right", Direction.right);

  constructor(public readonly name: string, public readonly direction: Direction) {}
}
interface IInputHandler {
  isKeyDown(action: InputAction): boolean;
  getKeysDown(): InputAction[];
}
type _KeyState = {
  [k: string]: boolean;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};
type _KeyBindings = {
  [k: string]: string[];
  up: string[];
  down: string[];
  left: string[];
  right: string[];
};
class InputHandler implements IInputHandler {
  constructor() {}
  isKeyDown(action: InputAction): boolean {
    return this._keyState[action.name]!;
  }

  getKeysDown() {
    const r: InputAction[] = [];
    if (this._keyState.up) r.push(InputAction.up);
    if (this._keyState.down) r.push(InputAction.down);
    if (this._keyState.left) r.push(InputAction.left);
    if (this._keyState.right) r.push(InputAction.right);
    return r;
  }

  private _useDefaultInputSystem = true;
  public get useDefaultInputSystem() { return this._useDefaultInputSystem; }
  public set useDefaultInputSystem(v) {
    if (v === this._useDefaultInputSystem) return;
    this.toggleDefaultInputSystem();
  }

  public toggleDefaultInputSystem() {
    this._useDefaultInputSystem = !this._useDefaultInputSystem;
    if (this._useDefaultInputSystem) {
      this.initDefaultInputs();
    } else {
      this.clearDefaultInputs();
    }
  }

  private static readonly defaultBindings: _KeyBindings = {
    up: ["ArrowUp", "Up", "w", "W"],
    down: ["ArrowDown", "Down", "s", "S"],
    left: ["ArrowLeft", "Left", "a", "A"],
    right: ["ArrowRight", "Right", "d", "D"],
  };

  private _keyState: _KeyState = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  private onKeyShell(e: KeyboardEvent, value: boolean) {
    if (InputHandler.defaultBindings.up.includes(e.key)) {
      this._keyState.up = value;
    } else if (InputHandler.defaultBindings.down.includes(e.key)) {
      this._keyState.down = value;
    } else if (InputHandler.defaultBindings.left.includes(e.key)) {
      this._keyState.left = value;
    } else if (InputHandler.defaultBindings.right.includes(e.key)) {
      this._keyState.right = value;
    }
  }

  // private onKeyDownCb = (e: KeyboardEvent) => this.onKeyDown(e);
  private onKeyDownCb = (e: KeyboardEvent) => this.onKeyShell(e, true);
  // private onKeyDown(e: KeyboardEvent) {
  //   if (InputHandler.defaultBindings.up.includes(e.key)) {
  //     this._keyState.up = true;
  //   } else if (InputHandler.defaultBindings.down.includes(e.key)) {
  //     this._keyState.down = true;
  //   } else if (InputHandler.defaultBindings.left.includes(e.key)) {
  //     this._keyState.left = true;
  //   } else if (InputHandler.defaultBindings.right.includes(e.key)) {
  //     this._keyState.right = true;
  //   }
  // }

  // private onKeyUpCb = (e: KeyboardEvent) => this.onKeyUp(e);
  private onKeyUpCb = (e: KeyboardEvent) => this.onKeyShell(e, false);
  // private onKeyUp(e: KeyboardEvent) {
  //   if (InputHandler.defaultBindings.up.includes(e.key)) {
  //     this._keyState.up = false;
  //   } else if (InputHandler.defaultBindings.down.includes(e.key)) {
  //     this._keyState.down = false;
  //   } else if (InputHandler.defaultBindings.left.includes(e.key)) {
  //     this._keyState.left = false;
  //   } else if (InputHandler.defaultBindings.right.includes(e.key)) {
  //     this._keyState.right = false;
  //   }
  // }

  private initDefaultInputs() {
    // document.addEventListener("keydown", e => this.onKeyDown(e));
    // document.addEventListener("keyup", e => this.onKeyUp(e));
    document.addEventListener("keydown", this.onKeyDownCb);
    document.addEventListener("keyup", this.onKeyUpCb);
  }

  private clearDefaultInputs() {
    // document.removeEventListener("keydown", e => this.onKeyDown(e));
    // document.removeEventListener("keyup", e => this.onKeyUp(e));
    document.removeEventListener("keydown", this.onKeyDownCb);
    document.removeEventListener("keyup", this.onKeyUpCb);
  }
}

export {
  InputAction,
  InputHandler,
};

export type {
  IInputHandler,
};
