import { Task } from "./task.js";

export function sleepUntil(date: Date, task?: Task) {
  return sleepFor(date.getTime() - Date.now(), task);
}

export function sleepFor(ms: number, task?: Task) {
  if (task == null) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  return new Promise<void>((resolve) => {
    const wake = () => {
      task.offCancel(wake);
      clearTimeout(timeout);
      resolve();
    };

    task.onCancel(wake);
    const timeout = setTimeout(wake, ms);
  });
}
