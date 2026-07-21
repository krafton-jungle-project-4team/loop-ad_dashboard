import { html } from "@codemirror/lang-html";
import { Annotation, Compartment, EditorState } from "@codemirror/state";
import { basicSetup, EditorView } from "codemirror";
import { useEffect, useEffectEvent, useRef } from "react";

const externalValueSync = Annotation.define<boolean>();

const dashboardEditorTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--card)",
    color: "var(--foreground)",
    fontSize: "0.8125rem",
    height: "100%",
    minHeight: "0"
  },
  "&.cm-focused": {
    outline: "none"
  },
  ".cm-activeLine": {
    backgroundColor: "var(--accent)"
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)"
  },
  ".cm-content": {
    caretColor: "var(--ring)",
    minHeight: "100%",
    padding: "0.75rem 0"
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--ring)"
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--muted)",
    borderColor: "var(--border)",
    color: "var(--muted-foreground)"
  },
  ".cm-gutterElement": {
    padding: "0 0.5rem 0 0.75rem"
  },
  ".cm-gutters": {
    backgroundColor: "var(--muted)",
    borderRight: "1px solid var(--border)",
    color: "var(--muted-foreground)"
  },
  ".cm-line": {
    padding: "0 0.75rem 0 0.5rem"
  },
  ".cm-matchingBracket": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
    outline: "1px solid var(--ring)"
  },
  ".cm-nonmatchingBracket": {
    backgroundColor: "color-mix(in oklab, var(--destructive) 12%, transparent)",
    color: "var(--destructive)"
  },
  ".cm-panels": {
    backgroundColor: "var(--muted)",
    color: "var(--foreground)"
  },
  ".cm-scroller": {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
    height: "100%",
    lineHeight: "1.6",
    minHeight: "0",
    overflow: "auto"
  },
  ".cm-searchMatch": {
    backgroundColor: "color-mix(in oklab, var(--primary) 18%, transparent)",
    outline: "1px solid color-mix(in oklab, var(--primary) 45%, transparent)"
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "var(--accent)"
  },
  ".cm-selectionBackground, ::selection": {
    backgroundColor: "var(--accent) !important"
  },
  ".cm-tooltip": {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    color: "var(--popover-foreground)"
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)"
  }
});

export type CreativeHtmlCodeEditorProps = {
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
};

export function CreativeHtmlCodeEditor({
  ariaLabel,
  disabled = false,
  onChange,
  value
}: CreativeHtmlCodeEditorProps) {
  const editorHostRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const editorConfigurationRef = useRef<EditorConfiguration | null>(null);
  const initialEditorPropsRef = useRef({ ariaLabel, disabled, value });
  const notifyChange = useEffectEvent(onChange);

  if (!editorConfigurationRef.current) {
    editorConfigurationRef.current = createEditorConfiguration();
  }
  const editorConfiguration = editorConfigurationRef.current;

  useEffect(() => {
    const parent = editorHostRef.current;
    if (!parent) return;

    const initialProps = initialEditorPropsRef.current;
    const view = new EditorView({
      doc: initialProps.value,
      extensions: [
        basicSetup,
        html({ autoCloseTags: true, matchClosingTags: true, selfClosingTags: true }),
        EditorState.tabSize.of(2),
        dashboardEditorTheme,
        editorConfiguration.editable.of(editableExtensions(initialProps.disabled)),
        editorConfiguration.accessibility.of(
          accessibilityExtension(initialProps.ariaLabel, initialProps.disabled)
        ),
        EditorView.updateListener.of((update) => {
          const isExternalValueSync = update.transactions.some((transaction) =>
            transaction.annotation(externalValueSync)
          );
          if (!update.docChanged || isExternalValueSync) return;
          notifyChange(update.state.doc.toString());
        })
      ],
      parent
    });
    editorViewRef.current = view;

    return () => {
      if (editorViewRef.current === view) {
        editorViewRef.current = null;
      }
      view.destroy();
    };
  }, [editorConfiguration]);

  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;

    view.dispatch({
      effects: [
        editorConfiguration.editable.reconfigure(editableExtensions(disabled)),
        editorConfiguration.accessibility.reconfigure(accessibilityExtension(ariaLabel, disabled))
      ]
    });
  }, [ariaLabel, disabled, editorConfiguration]);

  useEffect(() => {
    const view = editorViewRef.current;
    if (!view || view.state.doc.toString() === value) return;

    view.dispatch({
      annotations: externalValueSync.of(true),
      changes: { from: 0, insert: value, to: view.state.doc.length }
    });
  }, [value]);

  return (
    <div
      aria-disabled={disabled}
      className="h-full min-h-0 w-full overflow-hidden rounded-md border border-input bg-card shadow-[inset_0_1px_1px_rgb(43_34_51_/_0.04)] transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 data-[disabled=true]:bg-input/50 data-[disabled=true]:opacity-50"
      data-disabled={disabled}
      ref={editorHostRef}
    />
  );
}

type EditorConfiguration = {
  accessibility: Compartment;
  editable: Compartment;
};

function createEditorConfiguration(): EditorConfiguration {
  return {
    accessibility: new Compartment(),
    editable: new Compartment()
  };
}

function editableExtensions(disabled: boolean) {
  return [EditorState.readOnly.of(disabled), EditorView.editable.of(!disabled)];
}

function accessibilityExtension(ariaLabel: string, disabled: boolean) {
  return EditorView.contentAttributes.of({
    "aria-disabled": String(disabled),
    "aria-label": ariaLabel,
    "aria-readonly": String(disabled)
  });
}

export default CreativeHtmlCodeEditor;
