export type PostgresBoundQuery = {
  text: string;
  values: unknown[];
};

export function bindPostgresNamedParams(
  sqlText: string,
  params: Record<string, unknown>
): PostgresBoundQuery {
  const values: unknown[] = [];
  const names = new Map<string, number>();
  let text = "";
  let quote: "'" | '"' | null = null;

  for (let index = 0; index < sqlText.length; index += 1) {
    const char = sqlText[index];
    const next = sqlText[index + 1];

    if (quote) {
      text += char;
      if (char === quote) {
        if (quote === "'" && next === "'") {
          text += next;
          index += 1;
          continue;
        }
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      text += char;
      continue;
    }

    if (char === ":" && next !== ":" && isIdentifierStart(next)) {
      const start = index + 1;
      let cursor = start;
      while (cursor < sqlText.length && isIdentifierPart(sqlText[cursor])) {
        cursor += 1;
      }

      const name = sqlText.slice(start, cursor);
      if (!Object.hasOwn(params, name)) {
        throw new Error(`Missing SQL parameter: ${name}`);
      }

      const position = names.get(name) ?? values.push(params[name]);
      names.set(name, position);
      text += `$${position}`;
      index = cursor - 1;
      continue;
    }

    text += char;
  }

  return { text, values };
}

function isIdentifierStart(char: string | undefined) {
  return !!char && /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string | undefined) {
  return !!char && /[A-Za-z0-9_]/.test(char);
}
