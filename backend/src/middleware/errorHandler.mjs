import { config } from "../config/env.mjs";

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[Error ${status}] ${message}`, err);

  const response = {
    error: message,
    status
  };

  if (config.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}
