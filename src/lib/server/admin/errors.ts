/** Typed failure from admin services — map to HTTP status in `/api` routes. */
export class AdminOpError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminOpError";
    this.status = status;
  }
}

export function isAdminOpError(e: unknown): e is AdminOpError {
  return e instanceof AdminOpError;
}
