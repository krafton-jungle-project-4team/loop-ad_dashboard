import type { DatabaseError as PgDatabaseError } from "pg";
import { AppError, createDomainError } from "../../app-errors.js";
import type { QueryErrorPredicateMatcher } from "./query-error.js";

export type PgErrorField = "code" | "constraint" | "schema" | "table" | "column" | "routine";
export type PgErrorCriteria = Partial<Pick<PgDatabaseError, PgErrorField>>;
export type PgErrorMetadataCriteria = Omit<PgErrorCriteria, "code">;
export type DatabaseAccessErrorKind =
  | "badSqlGrammar"
  | "cannotAcquireLock"
  | "cannotSerializeTransaction"
  | "dataIntegrityViolation"
  | "dataAccessResourceFailure"
  | "deadlock"
  | "duplicateKey"
  | "permissionDenied"
  | "queryTimeout"
  | "transactionRollback"
  | "unknown";

export const DATABASE_ERRORS = {
  OPERATION_FAILED: {
    statusCode: 500,
    code: "DATABASE_ERROR",
    message: "Database operation failed."
  }
} as const;

export function createDatabaseError(
  error: (typeof DATABASE_ERRORS)[keyof typeof DATABASE_ERRORS],
  cause?: Error
) {
  return createDomainError(error, { cause });
}

export const pgSqlState = {
  cardinalityViolation: "21000",
  uniqueViolation: "23505",
  foreignKeyViolation: "23503",
  notNullViolation: "23502",
  checkViolation: "23514",
  exclusionViolation: "23P01",
  serializationFailure: "40001",
  deadlockDetected: "40P01",
  lockNotAvailable: "55P03",
  queryCanceled: "57014",
  insufficientPrivilege: "42501"
} as const;

export const pgSqlStateClass = {
  connectionException: "08",
  dataException: "22",
  integrityConstraintViolation: "23",
  transactionRollback: "40",
  syntaxOrAccessRuleViolation: "42",
  insufficientResources: "53",
  programLimitExceeded: "54",
  operatorIntervention: "57",
  systemError: "58"
} as const;

export const pgSpringPostgresSqlState = {
  badSqlGrammar: ["03000", "42000", "42601", "42602", "42622", "42804", "42P01"],
  duplicateKey: [pgSqlState.cardinalityViolation, pgSqlState.uniqueViolation],
  dataIntegrityViolation: [
    "23000",
    pgSqlState.notNullViolation,
    pgSqlState.foreignKeyViolation,
    pgSqlState.checkViolation
  ],
  dataAccessResourceFailure: ["53000", "53100", "53200", "53300"],
  cannotAcquireLock: [pgSqlState.lockNotAvailable],
  cannotSerializeTransaction: [pgSqlState.serializationFailure],
  deadlockLoser: [pgSqlState.deadlockDetected]
} as const;

export const pgErrors = {
  connectionException: (criteria?: PgErrorCriteria) =>
    pgErrorClass(pgSqlStateClass.connectionException, criteria),
  dataException: (criteria?: PgErrorCriteria) =>
    pgErrorClass(pgSqlStateClass.dataException, criteria),
  badSqlGrammar: (criteria?: PgErrorMetadataCriteria) =>
    pgAnyError(pgSpringPostgresSqlState.badSqlGrammar, criteria),
  dataIntegrityViolation: (criteria?: PgErrorCriteria) =>
    pgErrorClass(pgSqlStateClass.integrityConstraintViolation, criteria),
  syntaxOrAccessRuleViolation: (criteria?: PgErrorCriteria) =>
    pgErrorClass(pgSqlStateClass.syntaxOrAccessRuleViolation, criteria),
  resourceFailure: (criteria?: PgErrorCriteria) =>
    pgAnyErrorClass(
      [
        pgSqlStateClass.connectionException,
        pgSqlStateClass.insufficientResources,
        pgSqlStateClass.programLimitExceeded,
        pgSqlStateClass.operatorIntervention,
        pgSqlStateClass.systemError
      ],
      criteria
    ),
  dataAccessResourceFailure: (criteria?: PgErrorMetadataCriteria) =>
    pgAnyError(pgSpringPostgresSqlState.dataAccessResourceFailure, criteria),
  transactionRollback: (criteria?: PgErrorCriteria) =>
    pgErrorClass(pgSqlStateClass.transactionRollback, criteria),
  duplicateKey: (criteria?: PgErrorMetadataCriteria) =>
    pgAnyError(pgSpringPostgresSqlState.duplicateKey, criteria),
  cannotSerializeTransaction: (criteria?: PgErrorMetadataCriteria) =>
    pgAnyError(pgSpringPostgresSqlState.cannotSerializeTransaction, criteria),
  deadlockLoser: (criteria?: PgErrorMetadataCriteria) =>
    pgAnyError(pgSpringPostgresSqlState.deadlockLoser, criteria),
  cannotAcquireLock: (criteria?: PgErrorMetadataCriteria) =>
    pgAnyError(pgSpringPostgresSqlState.cannotAcquireLock, criteria),
  queryTimeout: (criteria?: PgErrorMetadataCriteria) =>
    pgError({ ...criteria, code: pgSqlState.queryCanceled }),
  insufficientPrivilege: (criteria?: PgErrorMetadataCriteria) =>
    pgError({ ...criteria, code: pgSqlState.insufficientPrivilege })
} as const;

export class DatabaseAccessError extends AppError {
  public readonly pg: PgErrorCriteria;

  constructor(
    public readonly kind: DatabaseAccessErrorKind,
    cause: Error
  ) {
    super(
      DATABASE_ERRORS.OPERATION_FAILED.code,
      DATABASE_ERRORS.OPERATION_FAILED.message,
      DATABASE_ERRORS.OPERATION_FAILED.statusCode,
      { cause }
    );
    this.name = new.target.name;
    this.pg = getPgErrorMetadata(cause);
  }
}

export class DatabaseDuplicateKeyError extends DatabaseAccessError {
  constructor(cause: PgDatabaseError) {
    super("duplicateKey", cause);
  }
}

export class DatabaseDataIntegrityViolationError extends DatabaseAccessError {
  constructor(cause: PgDatabaseError) {
    super("dataIntegrityViolation", cause);
  }
}

export class DatabaseBadSqlGrammarError extends DatabaseAccessError {
  constructor(cause: PgDatabaseError) {
    super("badSqlGrammar", cause);
  }
}

export class DatabaseResourceFailureError extends DatabaseAccessError {
  constructor(cause: PgDatabaseError) {
    super("dataAccessResourceFailure", cause);
  }
}

export class DatabaseTransactionRollbackError extends DatabaseAccessError {
  constructor(cause: PgDatabaseError) {
    super("transactionRollback", cause);
  }
}

export class DatabaseCannotAcquireLockError extends DatabaseAccessError {
  constructor(cause: PgDatabaseError) {
    super("cannotAcquireLock", cause);
  }
}

export class DatabaseCannotSerializeTransactionError extends DatabaseAccessError {
  constructor(cause: PgDatabaseError) {
    super("cannotSerializeTransaction", cause);
  }
}

export class DatabaseDeadlockError extends DatabaseAccessError {
  constructor(cause: PgDatabaseError) {
    super("deadlock", cause);
  }
}

export class DatabaseQueryTimeoutError extends DatabaseAccessError {
  constructor(cause: PgDatabaseError) {
    super("queryTimeout", cause);
  }
}

export class DatabasePermissionDeniedError extends DatabaseAccessError {
  constructor(cause: PgDatabaseError) {
    super("permissionDenied", cause);
  }
}

export class DatabaseUnknownError extends DatabaseAccessError {
  constructor(cause: PgDatabaseError) {
    super("unknown", cause);
  }
}

export const databaseErrors = {
  access: DatabaseAccessError,
  badSqlGrammar: DatabaseBadSqlGrammarError,
  cannotAcquireLock: DatabaseCannotAcquireLockError,
  cannotSerializeTransaction: DatabaseCannotSerializeTransactionError,
  dataIntegrityViolation: DatabaseDataIntegrityViolationError,
  dataAccessResourceFailure: DatabaseResourceFailureError,
  deadlock: DatabaseDeadlockError,
  duplicateKey: DatabaseDuplicateKeyError,
  permissionDenied: DatabasePermissionDeniedError,
  queryTimeout: DatabaseQueryTimeoutError,
  transactionRollback: DatabaseTransactionRollbackError,
  unknown: DatabaseUnknownError
} as const;

export function pgError(
  criteria: string | PgErrorCriteria
): QueryErrorPredicateMatcher<PgDatabaseError> {
  const normalizedCriteria = typeof criteria === "string" ? { code: criteria } : criteria;

  return {
    matches: (error): error is PgDatabaseError =>
      isPgDatabaseError(error) && matchesPgErrorCriteria(error, normalizedCriteria)
  };
}

export function pgAnyError(
  sqlStates: readonly string[],
  criteria: PgErrorMetadataCriteria = {}
): QueryErrorPredicateMatcher<PgDatabaseError> {
  return {
    matches: (error): error is PgDatabaseError =>
      isPgDatabaseError(error) &&
      typeof error.code === "string" &&
      sqlStates.includes(error.code) &&
      matchesPgErrorCriteria(error, criteria)
  };
}

export function pgErrorClass(
  sqlStateClass: string,
  criteria?: PgErrorCriteria
): QueryErrorPredicateMatcher<PgDatabaseError> {
  return pgAnyErrorClass([sqlStateClass], criteria);
}

export function pgAnyErrorClass(
  sqlStateClasses: readonly string[],
  criteria: PgErrorCriteria = {}
): QueryErrorPredicateMatcher<PgDatabaseError> {
  return {
    matches: (error): error is PgDatabaseError =>
      isPgDatabaseError(error) &&
      typeof error.code === "string" &&
      sqlStateClasses.includes(error.code.slice(0, 2)) &&
      matchesPgErrorCriteria(error, criteria)
  };
}

export function databaseFallbackError(error?: Error) {
  return createDatabaseError(DATABASE_ERRORS.OPERATION_FAILED, error);
}

export function translateDatabaseError(error: unknown) {
  if (error instanceof DatabaseAccessError || !isPgDatabaseError(error)) {
    return error;
  }

  if (pgErrors.duplicateKey().matches(error)) {
    return new DatabaseDuplicateKeyError(error);
  }

  if (pgErrors.cannotAcquireLock().matches(error)) {
    return new DatabaseCannotAcquireLockError(error);
  }

  if (pgErrors.cannotSerializeTransaction().matches(error)) {
    return new DatabaseCannotSerializeTransactionError(error);
  }

  if (pgErrors.deadlockLoser().matches(error)) {
    return new DatabaseDeadlockError(error);
  }

  if (pgErrors.queryTimeout().matches(error)) {
    return new DatabaseQueryTimeoutError(error);
  }

  if (pgErrors.dataIntegrityViolation().matches(error)) {
    return new DatabaseDataIntegrityViolationError(error);
  }

  if (pgErrors.badSqlGrammar().matches(error)) {
    return new DatabaseBadSqlGrammarError(error);
  }

  if (pgErrors.insufficientPrivilege().matches(error)) {
    return new DatabasePermissionDeniedError(error);
  }

  if (
    pgErrors.dataAccessResourceFailure().matches(error) ||
    pgErrors.resourceFailure().matches(error)
  ) {
    return new DatabaseResourceFailureError(error);
  }

  if (pgErrors.transactionRollback().matches(error)) {
    return new DatabaseTransactionRollbackError(error);
  }

  return new DatabaseUnknownError(error);
}

export function isPgDatabaseError(error: unknown): error is PgDatabaseError {
  return (
    error instanceof Error &&
    !(error instanceof AppError) &&
    typeof (error as Partial<PgDatabaseError>).code === "string"
  );
}

function matchesPgErrorCriteria(error: PgDatabaseError, criteria: PgErrorCriteria) {
  return pgErrorFields.every(
    (field) => criteria[field] === undefined || error[field] === criteria[field]
  );
}

function getPgErrorMetadata(error: Error): PgErrorCriteria {
  if (!isPgDatabaseError(error)) {
    return {};
  }

  const metadata: PgErrorCriteria = {};

  for (const field of pgErrorFields) {
    if (error[field] !== undefined) {
      metadata[field] = error[field];
    }
  }

  return metadata;
}

const pgErrorFields = [
  "code",
  "constraint",
  "schema",
  "table",
  "column",
  "routine"
] as const satisfies readonly PgErrorField[];
