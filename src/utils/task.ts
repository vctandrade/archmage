import EventEmitter from "events";

export class Task extends EventEmitter<TaskEventMap> {
  private _isCancelled = false;
  get isCancelled() {
    return this._isCancelled;
  }

  cancel() {
    if (this._isCancelled) {
      return;
    }

    this._isCancelled = true;
    this.emit("cancel");
  }

  static cancel() {
    const result = new Task();
    result.cancel();
    return result;
  }
}

interface TaskEventMap {
  cancel: [];
}
