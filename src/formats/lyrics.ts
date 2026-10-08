import { newRow, type Section, type SubtitleRow } from '../core/types';
export function parseLyrics(raw: string): { rows: SubtitleRow[]; sections: Section[] } {
  const rows: SubtitleRow[] = [], sections: Section[] = [];
  let section: Section | undefined;
  raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n').forEach((line, index) => {
    const tag = /^\s*\[(Intro|Verse(?:\s+\d+)?|Pre-Chorus(?:\s+\d+)?|Chorus(?:\s+\d+)?|Bridge|Outro|Instrumental)\]\s*$/i.exec(line);
    if (tag) {
      section = { id: crypto.randomUUID(), label: tag[1], sourceLine: index + 1, beforeRowId: null };
      sections.push(section);
    } else if (line.trim()) {
      const row = newRow(line); // Preserve lyric whitespace and repetitions verbatim.
      row.sectionId = section?.id ?? null;
      if (section && section.beforeRowId === null) section.beforeRowId = row.id;
      rows.push(row);
    }
  });
  return { rows, sections };
}
