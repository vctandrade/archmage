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
      task.off("cancel", wake);
      clearTimeout(timeout);
      resolve();
    };

    task.on("cancel", wake);
    const timeout = setTimeout(wake, ms);
  });
}
