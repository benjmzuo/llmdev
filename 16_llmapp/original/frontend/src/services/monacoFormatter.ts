import type * as Monaco from "monaco-editor";

const PRETTIER_PARSERS: Record<string, string> = {
  javascript: "babel",
  typescript: "typescript",
};

/** Returns true if the language has a browser-side formatter available. */
export function isFormattingSupported(language: string): boolean {
  return language in PRETTIER_PARSERS;
}

let registered = false;

/** Registers Prettier as a DocumentFormattingEditProvider for JS and TS. */
export function registerPrettierFormatter(
  monaco: typeof Monaco,
): void {
  if (registered) return;
  registered = true;

  const provider: Monaco.languages.DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits: async (model, options) => {
      const languageId = model.getLanguageId();
      const parser = PRETTIER_PARSERS[languageId];
      if (!parser) return [];

      try {
        const [prettier, babel, estree, ts] = await Promise.all([
          import("prettier/standalone"),
          import("prettier/plugins/babel"),
          import("prettier/plugins/estree"),
          import("prettier/plugins/typescript"),
        ]);

        const formatted = await prettier.format(model.getValue(), {
          parser,
          plugins: [babel.default, estree.default, ts.default],
          semi: true,
          singleQuote: false,
          tabWidth: options.tabSize,
          insertSpaces: options.insertSpaces,
          trailingComma: "all",
        });

        const fullRange = model.getFullModelRange();
        return [{ range: fullRange, text: formatted }];
      } catch {
        // Syntax errors or other failures — return no edits
        return [];
      }
    },
  };

  for (const languageId of Object.keys(PRETTIER_PARSERS)) {
    monaco.languages.registerDocumentFormattingEditProvider(
      languageId,
      provider,
    );
  }
}
