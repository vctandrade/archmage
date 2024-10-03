type Callback = () => void;

export class Task {
  private cancelCallbacks: Callback[] = [];

  private _isCancelled = false;
  get isCancelled() {
    return this._isCancelled;
  }

  cancel() {
    if (this._isCancelled) {
      return;
    }

    this._isCancelled = true;
    for (const callback of this.cancelCallbacks) {
      callback();
    }
  }

  onCancel(callback: Callback) {
    if (this._isCancelled) {
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
