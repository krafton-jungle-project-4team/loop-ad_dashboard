export class AppError extends Error {
  public override readonly cause?: unknown;

  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.cause = options?.cause;
  }
}

export type DomainErrorDefinition = {
  readonly statusCode: number;
  readonly code: string;
  readonly message: string;
};

export function createDomainError(error: DomainErrorDefinition, options?: ErrorOptions) {
  return new AppError(error.code, error.message, error.statusCode, options);
}
