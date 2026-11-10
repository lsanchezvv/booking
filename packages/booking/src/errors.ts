export type BookingErrorCode = "not_found" | "invalid_request" | "misconfigured" | "database";

export class BookingError extends Error {
  readonly code: BookingErrorCode;

  constructor(code: BookingErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "BookingError";
    this.code = code;
  }
}
