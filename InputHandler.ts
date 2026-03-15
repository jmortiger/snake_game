import { Direction } from "./Point2d";
import { DebugLevel } from "./DebugLevel";

class InputAction {
  public static readonly up = new InputAction("up", Direction.up);
  public static readonly down = new InputAction("down", Direction.down);
  public static readonly left = new InputAction("left", Direction.left);
  public static readonly right = new InputAction("right", Direction.right);

  private constructor(public readonly name: string, public readonly direction: Direction) {}
}

interface IInputHandler {
  /** Should the state overwrite released keys, or only update pressed/held keys? */
  get currentStateOnly(): boolean;
  isKeyDown(action: InputAction): boolean;
  wasKeyPressed(action: InputAction): boolean;
  getKeysDown(): InputAction[];
  getKeysPressed(): InputAction[];
  resetState(): void;

  // setInputState(i: InputAction, value: boolean): void;
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
  currentStateOnly = false;
  constructor() { this.initDefaultInputs(); }

  protected setInputState(i: InputAction, value = true): void {
    if (!this.currentStateOnly && !value) return;
    this._keyState[i.name] = value;
  }

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

class TouchInputHandler extends InputHandler {
  constructor(public readonly inputElements: { up: HTMLElement; down: HTMLElement; left: HTMLElement; right: HTMLElement }) {
    super();
    this.initDefaultTouchInputs();
  }

  protected _useDefaultTouchInputSystem = true;
  public get useDefaultTouchInputSystem() { return this._useDefaultTouchInputSystem; }
  public set useDefaultTouchInputSystem(v) {
    if (v === this._useDefaultTouchInputSystem) return;
    this.toggleDefaultTouchInputSystem();
  }

  public toggleDefaultTouchInputSystem() {
    this._useDefaultTouchInputSystem = !this._useDefaultTouchInputSystem;
    if (this._useDefaultTouchInputSystem) {
      this.initDefaultTouchInputs();
    } else {
      this.clearDefaultTouchInputs();
    }
  }

  private initDefaultTouchInputs() {
    this.inputElements.up.addEventListener("mousedown", this.cbMatrix.up.pressed);
    this.inputElements.up.addEventListener("mouseup", this.cbMatrix.up.released);
    this.inputElements.down.addEventListener("mousedown", this.cbMatrix.down.pressed);
    this.inputElements.down.addEventListener("mouseup", this.cbMatrix.down.released);
    this.inputElements.left.addEventListener("mousedown", this.cbMatrix.left.pressed);
    this.inputElements.left.addEventListener("mouseup", this.cbMatrix.left.released);
    this.inputElements.right.addEventListener("mousedown", this.cbMatrix.right.pressed);
    this.inputElements.right.addEventListener("mouseup", this.cbMatrix.right.released);
  }

  private clearDefaultTouchInputs() {
    this.inputElements.up.removeEventListener("mousedown", this.cbMatrix.up.pressed);
    this.inputElements.up.removeEventListener("mouseup", this.cbMatrix.up.released);
    this.inputElements.down.removeEventListener("mousedown", this.cbMatrix.down.pressed);
    this.inputElements.down.removeEventListener("mouseup", this.cbMatrix.down.released);
    this.inputElements.left.removeEventListener("mousedown", this.cbMatrix.left.pressed);
    this.inputElements.left.removeEventListener("mouseup", this.cbMatrix.left.released);
    this.inputElements.right.removeEventListener("mousedown", this.cbMatrix.right.pressed);
    this.inputElements.right.removeEventListener("mouseup", this.cbMatrix.right.released);
  }

  private readonly cbMatrix = {
    up: {
      pressed:  (_e: TouchEvent | MouseEvent) => this.setInputState(InputAction.up, true),
      released: (_e: TouchEvent | MouseEvent) => this.setInputState(InputAction.up, false),
    },
    down: {
      pressed:  (_e: TouchEvent | MouseEvent) => this.setInputState(InputAction.down, true),
      released: (_e: TouchEvent | MouseEvent) => this.setInputState(InputAction.down, false),
    },
    left: {
      pressed:  (_e: TouchEvent | MouseEvent) => this.setInputState(InputAction.left, true),
      released: (_e: TouchEvent | MouseEvent) => this.setInputState(InputAction.left, false),
    },
    right: {
      pressed:  (_e: TouchEvent | MouseEvent) => this.setInputState(InputAction.right, true),
      released: (_e: TouchEvent | MouseEvent) => this.setInputState(InputAction.right, false),
    },
  };
}

class DebugInputHandler extends InputHandler {
  constructor(public level: DebugLevel = DebugLevel.DEBUG) { super(); }
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
  TouchInputHandler,
};

export type {
  IInputHandler,
};
