import { DASHBOARD_CONTENT_CANDIDATE_HTML_MAX_BYTES } from "@loopad/shared";
import { useCallback, useEffect, useRef, useState } from "react";

const HTML_PREVIEW_DEBOUNCE_MS = 500;

export type ContentCandidateHtmlSource = {
  html: string;
  revision: string;
  updated_at: string;
};

export type ContentCandidateHtmlPreview = {
  html: string;
};

export type ContentCandidateHtmlSaveResult = {
  html: string;
  revision: string;
};

type ContentCandidateHtmlIdentity = {
  contentId: string;
  promotionId: string;
  segmentId: string;
};

export type ContentCandidateHtmlEditorActions = {
  isSavePending: boolean;
  loadSource: (
    identity: ContentCandidateHtmlIdentity,
    signal: AbortSignal
  ) => Promise<ContentCandidateHtmlSource>;
  previewHtml: (
    identity: ContentCandidateHtmlIdentity,
    html: string,
    signal: AbortSignal
  ) => Promise<ContentCandidateHtmlPreview>;
  saveHtml: (
    identity: ContentCandidateHtmlIdentity,
    request: { base_revision: string; html: string }
  ) => Promise<ContentCandidateHtmlSaveResult>;
};

export type HtmlValidationStatus = "idle" | "invalid" | "pending" | "valid";

type HtmlEditorSession = {
  baseRevision: string;
  draftHtml: string;
  initialHtml: string;
  initialPreviewHtml: string | null;
  previewHtml: string;
  validatedDraftHtml: string | null;
};

export function useContentCandidateHtmlEditor({
  active,
  loadSource,
  previewHtml,
  saveHtml
}: {
  active: boolean;
  loadSource: (signal: AbortSignal) => Promise<ContentCandidateHtmlSource>;
  previewHtml: (html: string, signal: AbortSignal) => Promise<ContentCandidateHtmlPreview>;
  saveHtml: (request: {
    base_revision: string;
    html: string;
  }) => Promise<ContentCandidateHtmlSaveResult>;
}) {
  const callbacksRef = useRef({ loadSource, previewHtml, saveHtml });
  callbacksRef.current = { loadSource, previewHtml, saveHtml };

  const [session, setSession] = useState<HtmlEditorSession | null>(null);
  const sessionRef = useRef<HtmlEditorSession | null>(null);
  const isSavingRef = useRef(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<HtmlValidationStatus>("idle");

  useEffect(() => {
    if (!active || session) {
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(null);

    void Promise.resolve()
      .then(() => callbacksRef.current.loadSource(controller.signal))
      .then((source) => {
        if (controller.signal.aborted) {
          return;
        }
        const nextSession = {
          baseRevision: source.revision,
          draftHtml: source.html,
          initialHtml: source.html,
          initialPreviewHtml: null,
          previewHtml: "",
          validatedDraftHtml: null
        };
        sessionRef.current = nextSession;
        setSession(nextSession);
        setIsLoading(false);
        setValidationError(null);
        setValidationStatus("pending");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setLoadError(errorMessage(error, "HTML을 불러오지 못했어요."));
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [active, loadAttempt, session]);

  useEffect(() => {
    if (
      !active ||
      !session ||
      (session.validatedDraftHtml !== null && session.draftHtml === session.validatedDraftHtml)
    ) {
      return;
    }

    if (!session.draftHtml) {
      setValidationError("HTML 내용을 입력해 주세요.");
      setValidationStatus("invalid");
      return;
    }
    if (
      new TextEncoder().encode(session.draftHtml).byteLength >
      DASHBOARD_CONTENT_CANDIDATE_HTML_MAX_BYTES
    ) {
      setValidationError("HTML은 2 MB 이하로 작성해 주세요.");
      setValidationStatus("invalid");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setValidationStatus("pending");
      setValidationError(null);
      void Promise.resolve()
        .then(() => callbacksRef.current.previewHtml(session.draftHtml, controller.signal))
        .then((preview) => {
          if (controller.signal.aborted) {
            return;
          }
          const current = sessionRef.current;
          if (!current || current.draftHtml !== session.draftHtml) {
            return;
          }
          const nextSession = {
            ...current,
            initialPreviewHtml:
              session.draftHtml === current.initialHtml ? preview.html : current.initialPreviewHtml,
            previewHtml: preview.html,
            validatedDraftHtml: session.draftHtml
          };
          sessionRef.current = nextSession;
          setSession(nextSession);
          setValidationError(null);
          setValidationStatus("valid");
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            return;
          }
          const current = sessionRef.current;
          if (!current || current.draftHtml !== session.draftHtml) {
            return;
          }
          setValidationError(errorMessage(error, "현재 HTML을 미리보기에 반영할 수 없어요."));
          setValidationStatus("invalid");
        });
    }, HTML_PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [active, session]);

  const updateDraftHtml = useCallback((draftHtml: string) => {
    const current = sessionRef.current;
    if (!current || isSavingRef.current || current.draftHtml === draftHtml) {
      return;
    }
    const isInitialHtml = draftHtml === current.initialHtml;
    const initialPreviewHtml = isInitialHtml ? current.initialPreviewHtml : null;
    const hasKnownInitialPreview = initialPreviewHtml !== null;
    const nextSession = {
      ...current,
      draftHtml,
      ...(hasKnownInitialPreview
        ? {
            previewHtml: initialPreviewHtml,
            validatedDraftHtml: current.initialHtml
          }
        : {})
    };
    sessionRef.current = nextSession;
    setSession(nextSession);
    setValidationError(null);
    const isKnownValidatedDraft =
      nextSession.validatedDraftHtml !== null && draftHtml === nextSession.validatedDraftHtml;
    setValidationStatus(isKnownValidatedDraft || hasKnownInitialPreview ? "valid" : "pending");
  }, []);

  const resetDraft = useCallback(() => {
    const current = sessionRef.current;
    if (!current || isSavingRef.current) {
      return;
    }
    const nextSession =
      current.initialPreviewHtml !== null
        ? {
            ...current,
            draftHtml: current.initialHtml,
            previewHtml: current.initialPreviewHtml,
            validatedDraftHtml: current.initialHtml
          }
        : { ...current, draftHtml: current.initialHtml };
    sessionRef.current = nextSession;
    setSession(nextSession);
    setValidationError(null);
    setValidationStatus(current.initialPreviewHtml !== null ? "valid" : "pending");
  }, []);

  const resetSession = useCallback(() => {
    sessionRef.current = null;
    isSavingRef.current = false;
    setSession(null);
    setLoadError(null);
    setIsLoading(false);
    setIsSaving(false);
    setValidationError(null);
    setValidationStatus("idle");
  }, []);

  const retryLoad = useCallback(() => {
    setLoadError(null);
    setLoadAttempt((current) => current + 1);
  }, []);

  const saveDraft = useCallback(async () => {
    const current = sessionRef.current;
    if (
      !current ||
      current.validatedDraftHtml === null ||
      current.draftHtml !== current.validatedDraftHtml
    ) {
      throw new Error("HTML 검증이 끝난 뒤 다시 저장해 주세요.");
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const saved = await callbacksRef.current.saveHtml({
        base_revision: current.baseRevision,
        html: current.draftHtml
      });
      const nextSession = {
        baseRevision: saved.revision,
        draftHtml: saved.html,
        initialHtml: saved.html,
        initialPreviewHtml: saved.html,
        previewHtml: saved.html,
        validatedDraftHtml: saved.html
      };
      sessionRef.current = nextSession;
      setSession(nextSession);
      setValidationError(null);
      setValidationStatus("valid");
      return saved;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, []);

  const isDirty = Boolean(session && session.draftHtml !== session.initialHtml);
  const canSave = Boolean(
    isDirty &&
    !isSaving &&
    validationStatus === "valid" &&
    session?.validatedDraftHtml !== null &&
    session?.draftHtml === session?.validatedDraftHtml
  );

  return {
    canSave,
    draftHtml: session?.draftHtml ?? "",
    isDirty,
    isLoading,
    isReady: session !== null,
    isSaving,
    loadError,
    previewHtml: session?.previewHtml ?? "",
    resetDraft,
    resetSession,
    retryLoad,
    saveDraft,
    updateDraftHtml,
    validationError,
    validationStatus
  };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
