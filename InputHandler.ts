import { Direction } from "./Point2d";
import { DebugLevel } from "./DebugLevel";
import { SnakeEvent } from "./Events";

type InputIndicatorStyle = {
  inputDown:        string;
  inputReleased:    string;
  inputUp:          string;
  inputCleared:     string;
  unsetBorderStyle: string;
  setBorderStyle:   string;
};

class InputAction {
  public static readonly up = new InputAction("up", Direction.up);
  public static readonly down = new InputAction("down", Direction.down);
  public static readonly left = new InputAction("left", Direction.left);
  public static readonly right = new InputAction("right", Direction.right);

  public static actions = [this.up, this.down, this.left, this.right];

  private constructor(public readonly name: string, public readonly direction: Direction) {}
}

interface IInputDisplay<T extends HTMLElement> {
  get up(): T;
  get down(): T;
  get left(): T;
  get right(): T;
}

type InputDisplayCb<T extends HTMLElement> = (args: InputEventArgs, element: T, state?: boolean) => void;
class InputDisplay<T extends HTMLElement> implements IInputDisplay<T> {
  static readonly defaultStyle: InputIndicatorStyle = {
    inputDown:        "rgba(0, 255, 0, 1)",
    inputReleased:    "rgba(255, 255, 0, .5)",
    inputUp:          "rgba(255, 0, 0, .5)",
    inputCleared:     "",
    unsetBorderStyle: "4px solid rgba(0, 0, 0, 0)",
    setBorderStyle:   "4px solid rgba(0, 255, 0, 1)",
  };

  static readonly e6Style: InputIndicatorStyle = {
    inputDown:        "rgba(42, 82, 142, 1)",
    inputReleased:    "rgba(255, 255, 0, .5)",
    inputUp:          "rgba(255, 0, 0, .5)",
    inputCleared:     "",
    unsetBorderStyle: "0px solid rgba(0, 0, 0, 0)",
    setBorderStyle:   "0px solid rgba(0, 255, 0, 1)",
  };

  constructor(
    public readonly inputHandler: IKeyHandler,
    public readonly up: T,
    public readonly down: T,
    public readonly left: T,
    public readonly right: T,
    private readonly onInputUp: InputDisplayCb<T> = this.defaultOnInputUp,
    private readonly onInputDown: InputDisplayCb<T> = this.defaultOnInputDown,
    private readonly onKeyStateChange: (args: StateEventArgs) => void = this.defaultOnKeyStateChange,
    private style = InputDisplay.e6Style,
  ) {
    inputHandler.inputDown.add(e => this.dispatchInputDown(e));
    inputHandler.inputUp.add(e => this.dispatchInputUp(e));
    inputHandler.keyStateChanged.add(e => this.onKeyStateChange(e));
    // Stop resizing on first input.
    const t = { up: false, down: false, left: false, right: false };
    this.onKeyStateChange({ priorState: t, state: t });
  }

  public static fromTouchInput<T extends HTMLElement>(
    inputHandler: TouchInputMixin<T>,
    onInputUp?: InputDisplayCb<T>,
    onInputDown?: InputDisplayCb<T>,
    onKeyStateChange?: (args: StateEventArgs) => void,
  ) {
    return new InputDisplay<T>(
      inputHandler,
      inputHandler.inputElements.up,
      inputHandler.inputElements.down,
      inputHandler.inputElements.left,
      inputHandler.inputElements.right,
      onInputUp,
      onInputDown,
      onKeyStateChange,
    );
  }

  private dispatchInputDown(args: InputEventArgs) {
    switch (args.action) {
    case InputAction.up:
      this.onInputDown(args, this.up);
      break;
    case InputAction.down:
      this.onInputDown(args, this.down);
      break;
    case InputAction.left:
      this.onInputDown(args, this.left);
      break;
    case InputAction.right:
      this.onInputDown(args, this.right);
      break;
    }
  }

  private dispatchInputUp(args: InputEventArgs) {
    switch (args.action) {
    case InputAction.up:
      this.onInputUp(args, this.up, args.state.up);
      break;
    case InputAction.down:
      this.onInputUp(args, this.down, args.state.down);
      break;
    case InputAction.left:
      this.onInputUp(args, this.left, args.state.left);
      break;
    case InputAction.right:
      this.onInputUp(args, this.right, args.state.right);
      break;
    }
  }

  private defaultOnInputDown(args: InputEventArgs, element: T, state = true) {
    element.style.backgroundColor = state ? this.style.inputDown : this.style.inputUp;
    this.defaultBorder(args);
  }

  private defaultOnInputUp(args: InputEventArgs, element: T, state = false) {
    element.style.backgroundColor = state ? this.style.inputReleased : this.style.inputCleared;
    this.defaultBorder(args);
  }

  private defaultOnKeyStateChange(args: StateEventArgs) {
    this.up.style.backgroundColor = args.state.up ? (args.action === InputAction.up ? this.style.inputDown : this.style.inputReleased) : this.style.inputCleared;
    this.down.style.backgroundColor = args.state.down ? (args.action === InputAction.down ? this.style.inputDown : this.style.inputReleased) : this.style.inputCleared;
    this.left.style.backgroundColor = args.state.left ? (args.action === InputAction.left ? this.style.inputDown : this.style.inputReleased) : this.style.inputCleared;
    this.right.style.backgroundColor = args.state.right ? (args.action === InputAction.right ? this.style.inputDown : this.style.inputReleased) : this.style.inputCleared;
    this.defaultBorder(args);
  }

  private defaultBorder(args: InputEventArgs | StateEventArgs) {
    this.up.style.border = args.state.up ? this.style.setBorderStyle : this.style.unsetBorderStyle;
    this.down.style.border = args.state.down ? this.style.setBorderStyle : this.style.unsetBorderStyle;
    this.left.style.border = args.state.left ? this.style.setBorderStyle : this.style.unsetBorderStyle;
    this.right.style.border = args.state.right ? this.style.setBorderStyle : this.style.unsetBorderStyle;
  }
}

type InputEventArgs = { action: InputAction; state: _KeyState; priorState: _KeyState };
type StateEventArgs = { action?: InputAction; state: _KeyState; priorState: _KeyState };
interface IKeyHandler {
  /** Should the state overwrite released keys, or only update pressed/held keys? */
  get currentStateOnly(): boolean;
  isKeyDown(action: InputAction): boolean;
  wasKeyPressed(action: InputAction): boolean;
  getKeysDown(): InputAction[];
  getKeysPressed(): InputAction[];
  resetState(): void;

  get keyStateChanged(): SnakeEvent<StateEventArgs>;
  get inputDown(): SnakeEvent<InputEventArgs>;
  get inputUp(): SnakeEvent<InputEventArgs>;
}
interface IInputHandler extends IKeyHandler {
  setInputState(i: InputAction, value: boolean): void;
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
  readonly keyStateChanged = new SnakeEvent<StateEventArgs>();
  readonly inputDown = new SnakeEvent<InputEventArgs>();
  readonly inputUp = new SnakeEvent<InputEventArgs>();
  watchGlobal = true;
  constructor(
    public readonly watchedElement: HTMLElement | undefined = undefined,
  ) {
    if (watchedElement && (!watchedElement.isContentEditable || typeof(watchedElement.tabIndex) !== "number" || watchedElement.tabIndex === -1))
      watchedElement.tabIndex = 0;
    this.initDefaultInputs();
  }

  public setInputState(i: InputAction, value = true): void {
    if (!this.currentStateOnly && !value) return;
    const prior = structuredClone(this._keyState);
    this._keyState[i.name] = value;
    this.keyStateChanged.fire({ action: i, state: structuredClone(this._keyState), priorState: prior });
  }

  public isKeyDown(action: InputAction): boolean {
    return this._keyState[action.name]!;
  }

  readonly wasKeyPressed = this.isKeyDown;

  public getKeysDown() {
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

  private static _defaultBindingsReversed: Map<string, InputAction[]> | undefined;
  private static get defaultBindingsReversed(): Map<string, InputAction[]> {
    if (this._defaultBindingsReversed) return this._defaultBindingsReversed;
    this._defaultBindingsReversed = new Map<string, InputAction[]>();
    InputAction.actions.forEach(e => this.defaultBindings[e.name]!.forEach(e1 => (this._defaultBindingsReversed?.get(e1) ?? this._defaultBindingsReversed?.set(e1, [])?.get(e1))?.push(e)));
    return this._defaultBindingsReversed;
  }

  private _keyState: _KeyState = {
    up:    false,
    down:  false,
    left:  false,
    right: false,
  };

  protected get keyState() { return this._keyState; }
  protected onKeyShellBeforeDispatch(e: KeyboardEvent, value: boolean, action: InputAction) {}

  protected onKeyShell(e: KeyboardEvent, value: boolean) {
    if (e.target === this.watchedElement) {
      e.preventDefault();
      e.stopPropagation();
    } else if (!this.watchGlobal) return;
    const event = value ? this.inputDown : this.inputUp,
          prior = structuredClone(this._keyState),
          actions = InputHandler.defaultBindingsReversed.get(e.key);
    if (!this.currentStateOnly && !value) {
      const after = structuredClone(this._keyState);
      actions?.forEach(a => event.fire({ action: a, state: after, priorState: prior }));
      return;
    }
    let a: InputAction;
    if (InputHandler.defaultBindings.up.includes(e.key)) {
      this._keyState.up = value;
      a = InputAction.up;
    } else if (InputHandler.defaultBindings.down.includes(e.key)) {
      this._keyState.down = value;
      a = InputAction.down;
    } else if (InputHandler.defaultBindings.left.includes(e.key)) {
      this._keyState.left = value;
      a = InputAction.left;
    } else if (InputHandler.defaultBindings.right.includes(e.key)) {
      this._keyState.right = value;
      a = InputAction.right;
    } else return;
    this.onKeyShellBeforeDispatch(e, value, a);
    const after = structuredClone(this._keyState);
    event.fire({ action: a, state: after, priorState: prior });
  }

  private onKeyDownCb: EventListener = ((e: KeyboardEvent) => this.onKeyShell(e, true)) as EventListener;
  private onKeyUpCb:   EventListener = ((e: KeyboardEvent) => this.onKeyShell(e, false)) as EventListener;

  private initDefaultInputs() {
    (this.watchedElement ?? document).addEventListener("keydown", this.onKeyDownCb);
    (this.watchedElement ?? document).addEventListener("keyup", this.onKeyUpCb);
  }

  private clearDefaultInputs() {
    (this.watchedElement ?? document).removeEventListener("keydown", this.onKeyDownCb);
    (this.watchedElement ?? document).removeEventListener("keyup", this.onKeyUpCb);
  }

  public resetState(): void {
    const prior = structuredClone(this._keyState);
    this._keyState = {
      up:    false,
      down:  false,
      left:  false,
      right: false,
    };
    this.keyStateChanged.fire({ state: structuredClone(this._keyState), priorState: prior });
  }
}

class QueuedInputHandler extends InputHandler {
  private readonly inputQueue: InputAction[] = [];
  constructor(
    watchedElement: HTMLElement | undefined = undefined,
    public readonly queueMaxLength = 2,
  ) { super(watchedElement); }

  override setInputState(i: InputAction, value = true): void {
    if (!this.currentStateOnly && !value) return;
    const prior = structuredClone(this.keyState);
    if (value) this.enqueueInputAction(i);
    this.keyState[i.name] = value;
    this.keyStateChanged.fire({ action: i, state: structuredClone(this.keyState), priorState: prior });
  }

  public enqueueInputAction(action: InputAction) {
    if (!action)
      return false;
    const queue = this.inputQueue;
    const tail = queue.at(-1);
    if (tail?.direction === action.direction)
      return false;
    if (tail?.direction === action.direction.opposite)
      return false;
    if (queue.length >= this.queueMaxLength)
      return false;
    queue.push(action);
    return true;
  }

  public dequeueNextValidDirection(currentDirection: Direction) {
    while (this.inputQueue.length > 0) {
      const action = this.inputQueue.shift();
      if (!action)
        continue;
      if (currentDirection && action.direction === currentDirection.opposite)
        continue;
      return action.direction;
    }
    return undefined;
  }

  public clearInputQueue() { this.inputQueue.splice(0); }

  protected override onKeyShell(e: KeyboardEvent, value: boolean): void {
    if (value && e.repeat) return;
    super.onKeyShell(e, value);
  }

  protected override onKeyShellBeforeDispatch(e: KeyboardEvent, value: boolean, action: InputAction): void {
    this.enqueueInputAction(action);
  }
}

class TouchInputMixin<T extends HTMLElement> implements IKeyHandler {
  constructor(
    public readonly inputElements: { up: T; down: T; left: T; right: T },
    watchedElement?: HTMLElement,
    public readonly inputHandler: IInputHandler = new InputHandler(watchedElement),
  ) {
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
      pressed:  (_e: TouchEvent | MouseEvent) => this.inputHandler.setInputState(InputAction.up, true),
      released: (_e: TouchEvent | MouseEvent) => this.inputHandler.setInputState(InputAction.up, false),
    },
    down: {
      pressed:  (_e: TouchEvent | MouseEvent) => this.inputHandler.setInputState(InputAction.down, true),
      released: (_e: TouchEvent | MouseEvent) => this.inputHandler.setInputState(InputAction.down, false),
    },
    left: {
      pressed:  (_e: TouchEvent | MouseEvent) => this.inputHandler.setInputState(InputAction.left, true),
      released: (_e: TouchEvent | MouseEvent) => this.inputHandler.setInputState(InputAction.left, false),
    },
    right: {
      pressed:  (_e: TouchEvent | MouseEvent) => this.inputHandler.setInputState(InputAction.right, true),
      released: (_e: TouchEvent | MouseEvent) => this.inputHandler.setInputState(InputAction.right, false),
    },
  };

  public get currentStateOnly(): boolean {
    return this.inputHandler.currentStateOnly;
  }

  public isKeyDown(action: InputAction): boolean {
    return this.inputHandler.isKeyDown(action);
  }

  public wasKeyPressed(action: InputAction): boolean {
    return this.inputHandler.wasKeyPressed(action);
  }

  public getKeysDown(): InputAction[] {
    return this.inputHandler.getKeysDown();
  }

  public getKeysPressed(): InputAction[] {
    return this.inputHandler.getKeysPressed();
  }

  public resetState(): void {
    return this.inputHandler.resetState();
  }

  public get keyStateChanged(): SnakeEvent<StateEventArgs> {
    return this.inputHandler.keyStateChanged;
  }

  public get inputDown(): SnakeEvent<InputEventArgs> {
    return this.inputHandler.inputDown;
  }

  public get inputUp(): SnakeEvent<InputEventArgs> {
    return this.inputHandler.inputUp;
  }
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
  TouchInputMixin,
  InputDisplay,
  QueuedInputHandler,
};

export type {
  IInputHandler,
  IKeyHandler,
  InputDisplayCb,
  StateEventArgs,
};
