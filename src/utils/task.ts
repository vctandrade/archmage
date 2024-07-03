import EventEmitter from "events";

export class Task extends EventEmitter {
  private cancelled_ = false;

  get cancelled() {
    return this.cancelled_;
  }

  cancel() {
    if (this.cancelled_) {
      return;
    }

    this.cancelled_ = true;
    this.emit("cancel");
  }
}
