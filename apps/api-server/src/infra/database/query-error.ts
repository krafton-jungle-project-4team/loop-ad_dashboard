export type QueryErrorConstructor<TError extends Error = Error> = abstract new (
  ...args: never[]
) => TError;

export interface QueryErrorPredicateMatcher<TError extends Error = Error> {
  matches: (error: unknown) => error is TError;
}

export type QueryErrorMatcher<TError extends Error = Error> =
  | QueryErrorConstructor<TError>
  | QueryErrorPredicateMatcher<TError>
  | string;

export type QueryErrorFactory<TError extends Error = Error> = (error: TError) => Error;

export type QueryErrorMapping<TError extends Error = Error> = readonly [
  matcher: QueryErrorMatcher<TError>,
  errorFactory: QueryErrorFactory<TError>
];

export type QueryErrorTranslator = (error: unknown) => unknown;

export interface QueryPromise<
  TResult,
  TDefaultError extends Error = Error
> extends Promise<TResult> {
  mapErr: {
    (errorFactory: QueryErrorFactory<TDefaultError>): QueryPromise<TResult, TDefaultError>;
    <TError extends Error>(
      mapping: QueryErrorMapping<TError>
    ): QueryPromise<TResult, TDefaultError>;
  };
}

interface QueryPromiseOptions<TDefaultError extends Error = Error> {
  defaultMapErrMatcher?: QueryErrorMatcher<TDefaultError>;
  translateError?: QueryErrorTranslator;
}

export function createQueryPromise<TResult, TDefaultError extends Error = Error>(
  callback: () => Promise<TResult>,
  options: QueryPromiseOptions<TDefaultError> = {}
): QueryPromise<TResult, TDefaultError> {
  const translateError = options.translateError ?? keepError;
  const defaultMapErrMatcher =
    options.defaultMapErrMatcher ?? (Error as unknown as QueryErrorMatcher<TDefaultError>);
  const promise = callback().catch((error) => {
    throw translateError(error);
  }) as QueryPromise<TResult, TDefaultError>;

  promise.mapErr = ((arg: QueryErrorFactory<TDefaultError> | QueryErrorMapping) => {
    const mappings = normalizeErrorMapping(arg, defaultMapErrMatcher);

    return createQueryPromise(
      async () => {
        try {
          return await promise;
        } catch (error) {
          const mappedError = getMappedError(error, mappings);

          if (mappedError) {
            throw mappedError;
          }

          throw error;
        }
      },
      { defaultMapErrMatcher, translateError: keepError }
    );
  }) as QueryPromise<TResult, TDefaultError>["mapErr"];

  return promise;
}

function normalizeErrorMapping<TDefaultError extends Error>(
  arg: QueryErrorFactory<TDefaultError> | QueryErrorMapping,
  defaultMatcher: QueryErrorMatcher<TDefaultError>
) {
  if (typeof arg === "function") {
    return [[defaultMatcher, arg as unknown as (error: Error) => Error]] as const;
  }

  return [arg as QueryErrorMapping];
}

function getMappedError(error: unknown, mappings: readonly QueryErrorMapping[]) {
  for (const [matcher, errorFactory] of mappings) {
    if (matchesError(error, matcher)) {
      return errorFactory(error as Error);
    }
  }

  return null;
}

function matchesError(error: unknown, matcher: QueryErrorMatcher) {
  if (typeof matcher === "string") {
    return getErrorName(error) === matcher;
  }

  if ("matches" in matcher) {
    return matcher.matches(error);
  }

  return error instanceof matcher;
}

function getErrorName(error: unknown) {
  if (error instanceof Error) {
    return error.name;
  }

  return typeof error;
}

function keepError(error: unknown) {
  return error;
}
