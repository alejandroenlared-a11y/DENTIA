const ORDINAL_WORDS = ["primer", "segund", "tercer"];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function parseSlotChoice(body: string, optionCount: number): number | null {
  const text = normalize(body).trim();

  const digitMatch = text.match(/\b([1-9])\b/);
  if (digitMatch) {
    const index = Number(digitMatch[1]) - 1;
    if (index >= 0 && index < optionCount) {
      return index;
    }
  }

  for (let index = 0; index < ORDINAL_WORDS.length && index < optionCount; index += 1) {
    if (text.includes(ORDINAL_WORDS[index])) {
      return index;
    }
  }

  return null;
}
