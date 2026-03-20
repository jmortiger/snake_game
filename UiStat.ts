import type { SnakeEvent } from "./Events";

export default interface UiStat<T extends HTMLElement> {
  renderStats(): T | T[];
}

function _shell<EventArgs, T extends HTMLElement>(gen: (args: EventArgs) => T, initial: T) {
  return (v: EventArgs) => {
    const newE = gen(v);
    initial.parentElement?.replaceChild(newE, initial);
    initial = newE;
  };
}

function bindToEvent<EventArgs, T extends HTMLElement>(event: SnakeEvent<EventArgs>, generator: (args: EventArgs) => T, initialValue: EventArgs | T) {
  const e = initialValue instanceof HTMLElement ? initialValue : generator(initialValue);
  event.add(_shell(generator, e));
  return e;
}

function _shellElements<EventArgs, T extends HTMLElement>(gen: (args: EventArgs) => T[], initial: T[]) {
  return (v: EventArgs) => {
    const newEs = gen(v);
    if (newEs.length !== initial.length) throw new Error("Inconsistent number of elements");
    for (let i = 0; i < initial.length; i++) {
      const oldE = initial[i], newE = newEs[i];
      if (!oldE || !newE) continue;
      oldE.parentElement?.replaceChild(newE, oldE);
    }
    initial = newEs;
  };
}

function bindElementsToEvent<EventArgs, T extends HTMLElement>(event: SnakeEvent<EventArgs>, generator: (args: EventArgs) => T[], initialValue: EventArgs | T[]) {
  const e = initialValue instanceof Array ? initialValue : generator(initialValue);
  event.add(_shellElements(generator, e));
  return e;
}

function _shellMappedElements<EventArgs, T extends HTMLElement>(gen: (args: EventArgs) => { [k: string]: T }, initial: { [k: string]: T }) {
  return (v: EventArgs) => {
    const newEs = gen(v);
    // throw new Error("Inconsistent number of elements");
    for (const key in initial) {
      if (!Object.hasOwn(initial, key)) continue;

      const oldE = initial[key], newE = newEs[key];
      if (!oldE || !newE) continue;
      oldE.parentElement?.replaceChild(newE, oldE);
    }
    initial = newEs;
  };
}

function bindMappedElementsToEvent<EventArgs, T extends HTMLElement>(event: SnakeEvent<EventArgs>, generator: (args: EventArgs) => { [k: string]: T }, initialValue: EventArgs, generateInitialElements?: true): { [k: string]: T };
function bindMappedElementsToEvent<EventArgs, T extends HTMLElement>(event: SnakeEvent<EventArgs>, generator: (args: EventArgs) => { [k: string]: T }, initialValue: { [k: string]: T }, generateInitialElements?: false): { [k: string]: T };
function bindMappedElementsToEvent<EventArgs, T extends HTMLElement>(event: SnakeEvent<EventArgs>, generator: (args: EventArgs) => { [k: string]: T }, initialValue: EventArgs | { [k: string]: T }, generateInitialElements = true): { [k: string]: T } {
  const e = generateInitialElements ? generator(initialValue as EventArgs) : initialValue as { [k: string]: T };
  event.add(_shellMappedElements(generator, e));
  return e;
}

export type {
  UiStat,
};

export {
  bindToEvent,
  bindElementsToEvent,
  bindMappedElementsToEvent,
};
