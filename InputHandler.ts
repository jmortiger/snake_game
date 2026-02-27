import { Direction } from "./Point2d";
import { DebugLevel } from "./DebugLevel";

class InputAction {
  public static readonly up = new InputAction("up", Direction.up);
  public static readonly down = new InputAction("down", Direction.down);
  public static readonly left = new InputAction("left", Direction.left);
  public static readonly right = new InputAction("right", Direction.right);

  constructor(public readonly name: string, public readonly direction: Direction) {}
}
interface IInputHandler {
  /** Should the state overwrite released keys, or only update pressed/held keys? */
  get currentStateOnly(): boolean;
  isKeyDown(action: InputAction): boolean;
  wasKeyPressed(action: InputAction): boolean;
  getKeysDown(): InputAction[];
  getKeysPressed(): InputAction[];
  resetState(): void;
}
type _KeyState = {
  [k: string]: boolean;
  up:          boolean;
  down:        boolean;
  left:        boolean;
  right:       boolean;
};
type _KeyBindings = {
  [k: string]: string[];
  up:          string[];
  down:        string[];
  left:        string[];
  right:       string[];
};
class InputHandler implements IInputHandler {
  currentStateOnly = true;
  // constructor() { this.toggleDefaultInputSystem();this.toggleDefaultInputSystem(); }
  constructor() { this.initDefaultInputs(); }
  isKeyDown(action: InputAction): boolean {
    return this._keyState[action.name]!;
  }

  readonly wasKeyPressed = this.isKeyDown;

  getKeysDown() {
    const r: InputAction[] = [];
    if (this._keyState.up) r.push(InputAction.up);
    if (this._keyState.down) r.push(InputAction.down);
    if (this._keyState.left) r.push(InputAction.left);
    if (this._keyState.right) r.push(InputAction.right);
    return r;
  }

  readonly getKeysPressed = this.getKeysDown;

  protected _useDefaultInputSystem = true;
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
    up:    ["ArrowUp", "Up", "w", "W"],
    down:  ["ArrowDown", "Down", "s", "S"],
    left:  ["ArrowLeft", "Left", "a", "A"],
    right: ["ArrowRight", "Right", "d", "D"],
  };

  private _keyState: _KeyState = {
    up:    false,
    down:  false,
    left:  false,
    right: false,
  };
  protected get keyState() { return this._keyState; }

  protected onKeyShell(e: KeyboardEvent, value: boolean) {
    if (!this.currentStateOnly && !value) return;
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

  private onKeyDownCb = (e: KeyboardEvent) => this.onKeyShell(e, true);
  private onKeyUpCb = (e: KeyboardEvent) => this.onKeyShell(e, false);

  private initDefaultInputs() {
    document.addEventListener("keydown", this.onKeyDownCb);
    document.addEventListener("keyup", this.onKeyUpCb);
  }

  private clearDefaultInputs() {
    document.removeEventListener("keydown", this.onKeyDownCb);
    document.removeEventListener("keyup", this.onKeyUpCb);
  }

  public resetState(): void {
    this._keyState = {
      up:    false,
      down:  false,
      left:  false,
      right: false,
    };
  }
}

/* class FrameInputHandler implements IInputHandler {
  // constructor() { this.toggleDefaultInputSystem();this.toggleDefaultInputSystem(); }
  constructor() { this.initDefaultInputs(); }
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

  protected _useDefaultInputSystem = true;
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
    up:    ["ArrowUp", "Up", "w", "W"],
    down:  ["ArrowDown", "Down", "s", "S"],
    left:  ["ArrowLeft", "Left", "a", "A"],
    right: ["ArrowRight", "Right", "d", "D"],
  };

  private _keyState:             _KeyState[] = [];
  private _priorKeyState:        _KeyState[] = [];
  private _lastComposedKeyState: _KeyState = {
    up:    false,
    down:  false,
    left:  false,
    right: false,
  };

  private get priorFrameKeyState() {
    this._keyState.reduce((acc, state) => {
      if (state.up)
    }, {
      up:    false,
      down:  false,
      left:  false,
      right: false,
    });
  }

  protected onKeyShell(e: KeyboardEvent, value: boolean) {
    let changed = false;
    if (InputHandler.defaultBindings.up.includes(e.key)) {
      this._keyState.up = value;
      changed = true;
    } else if (InputHandler.defaultBindings.down.includes(e.key)) {
      this._keyState.down = value;
      changed = true;
    } else if (InputHandler.defaultBindings.left.includes(e.key)) {
      this._keyState.left = value;
      changed = true;
    } else if (InputHandler.defaultBindings.right.includes(e.key)) {
      this._keyState.right = value;
      changed = true;
    }
    // if (changed)
  }

  private onKeyDownCb = (e: KeyboardEvent) => this.onKeyShell(e, true);
  private onKeyUpCb = (e: KeyboardEvent) => this.onKeyShell(e, false);

  private initDefaultInputs() {
    document.addEventListener("keydown", this.onKeyDownCb);
    document.addEventListener("keyup", this.onKeyUpCb);
  }

  private clearDefaultInputs() {
    document.removeEventListener("keydown", this.onKeyDownCb);
    document.removeEventListener("keyup", this.onKeyUpCb);
  }
} */

class DebugInputHandler extends InputHandler {
  constructor(public level: DebugLevel = DebugLevel.LOG) { super(); }
  override toggleDefaultInputSystem(): void {
    this.level.print(DebugLevel.INFO, "Toggling default input system %o", this.useDefaultInputSystem ? "off" : "on");
    super.toggleDefaultInputSystem();
  }

  protected override onKeyShell(e: KeyboardEvent, value: boolean): void {
    this.level.print(DebugLevel.LOG, "Key %s %s", e.key, value ? "pressed" : "released");
    this.level.print(DebugLevel.DEBUG, "Prior State: %o", super.keyState);
    super.onKeyShell(e, value);
    this.level.print(DebugLevel.DEBUG, "New State: %o", super.keyState);
  }

  override resetState(): void {
    this.level.print(DebugLevel.INFO, "Resetting key state...");
    this.level.print(DebugLevel.DEBUG, "Prior State: %o", super.keyState);
    super.resetState();
    this.level.print(DebugLevel.DEBUG, "New State: %o", super.keyState);
  }
}

export {
  InputAction,
  InputHandler,
  DebugInputHandler,
};

export type {
  IInputHandler,
};
