import { AsyncLocalStorage } from "node:async_hooks";
import type { McpCaller } from "./auth";

const storage = new AsyncLocalStorage<McpCaller>();

export function runWithCaller<T>(caller: McpCaller, fn: () => T): T {
  return storage.run(caller, fn);
}

export function getRequestCaller(): McpCaller | undefined {
  return storage.getStore();
}
