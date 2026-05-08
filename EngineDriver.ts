import { DebugLevel } from "./DebugLevel";
import SnakeEngine from "./SnakeEngine";

export default class EngineDriver {
  private get onManualUpdateMode() { return SnakeEngine.debugLevel.eval(DebugLevel.DEBUG); }
  private timerId?: number;
  private _isDriving = true;
  public get isDriving() { return this._isDriving; }
  constructor(private readonly engine: SnakeEngine) {

  }

  public startDriving() {
    if (this.isDriving && this.timerId) return false;
    this._isDriving = true;
    // e => this.playOnSpaceBar(e);
    // this.playOnSpaceBar.bind(this);
    if (this.onManualUpdateMode) document.onkeyup = this.bound_playOnSpaceBar;
    else this.setNextTimeout();
    return true;
  }

  private doTick() {
    this.engine.update();
    if (this.isDriving)
      this.setNextTimeout();
  }

  private setNextTimeout() {
    this.timerId = window.setTimeout(() => this.doTick(), this.engine.effectiveTickRate);
  }

  private playOnSpaceBar(e: KeyboardEvent) { if (e.key === " ") this.engine.update(); }
  private bound_playOnSpaceBar = this.playOnSpaceBar.bind(this);

  public stopDriving(force = false) {
    if (!force && !this.timerId && document.onkeyup !== this.playOnSpaceBar && document.onkeyup !== this.bound_playOnSpaceBar) return false;
    if (!this.onManualUpdateMode) {
      window.clearTimeout(this.timerId);
      this.timerId = undefined;
    } else {
      document.onkeyup = null;
    }
    this._isDriving = false;
    return true;
  }
}
