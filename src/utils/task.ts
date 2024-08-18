import { Lock } from "./lock.js";

type Callback = () => void;

export class Task {
  private cancelCallbacks: Callback[] = [];

  private _cancelled = false;
  get cancelled() {
    return this._cancelled;
  }

  cancel() {
    if (this._cancelled) {
      return;
    }

    this._cancelled = true;
    for (const callback of this.cancelCallbacks) {
      callback();
    }
  }

  onCancel(callback: Callback) {
    if (this._cancelled) {
      callback();
      return;
    }

    this.cancelCallbacks.push(callback);
  }

  offCancel(callback: Callback) {
    const index = this.cancelCallbacks.findIndex((entry) => entry == callback);
    this.cancelCallbacks.splice(index, 1);
  }

  static cancel() {
    const result = new Task();
    result.cancel();
    return result;
  }
}
