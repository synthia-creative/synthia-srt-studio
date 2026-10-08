import { describe, expect, it } from 'vitest';
import { parseLyrics } from '../formats/lyrics';
import { parseSrt, writeSrt } from '../formats/srt';
import { parseProject, writeProject } from '../formats/project';
import { newProject, newRow } from '../core/types';
import { formatTime, milliseconds, parseTime } from '../core/time';
import { safeFilename } from '../formats/files';
import { validateRows } from '../core/validation';

describe('lyrics', () => {
  it('preserves Japanese, English, spaces and repetitions while keeping sections out of subtitles', () => {
    const raw = '[Intro]\r\n\r\n[Verse 1]\r\n  夜の向こうへ  \r\nKeep  the light\r\n[Pre-Chorus]\r\n届いて\r\n[Chorus]\r\n同じ歌\r\n同じ歌\r\n[Bridge]\r\n橋\r\n[Outro]\r\n終わり\r\n[Instrumental]';
    const result = parseLyrics(raw);
    expect(result.rows.map(r => r.text)).toEqual(['  夜の向こうへ  ', 'Keep  the light', '届いて', '同じ歌', '同じ歌', '橋', '終わり']);
    expect(result.sections.map(s => s.label)).toEqual(['Intro', 'Verse 1', 'Pre-Chorus', 'Chorus', 'Bridge', 'Outro', 'Instrumental']);
    expect(new Set(result.rows.map(r => r.id)).size).toBe(7);
    expect(result.sections[0].beforeRowId).toBeNull();
    expect(result.rows[0].sectionId).toBe(result.sections[1].id);
  });
  it('does not strip lyric-like unrecognized bracket text or numeric lyrics', () => {
    expect(parseLyrics('[愛してる]\n123\n (Hello) ').rows.map(r => r.text)).toEqual(['[愛してる]', '123', ' (Hello) ']);
  });
});
describe('millisecond timestamps', () => {
  it.each([['01:02:03,004', 3723004], ['02:03.5', 123500], ['00:59,999', 59999], ['--:--,---', null], ['--:--:--,---', null], ['', null]])('parses %s', (text, value) => expect(parseTime(text as string)).toBe(value));
  it('rounds media seconds once, including the second carry', () => {
    expect(milliseconds(59.9996)).toBe(60000); expect(formatTime(milliseconds(59.9996))).toBe('00:01:00,000');
    expect(milliseconds(1.9999999)).toBe(2000);
  });
  it.each(['00:60:00,000', '00:00:60,000', '-00:01,000', 'NaN', '00:00:00,0000'])('rejects invalid time %s', time => expect(() => parseTime(time)).toThrow());
});
describe('SRT roundtrip and validation', () => {
  const sample = '1\r\n00:00:01,234 --> 00:00:03,004\r\n  きみと  \r\nKeep the light\r\n\r\n2\r\n00:00:04,000 --> 00:00:05,500\r\n同じ歌\r\n';
  it('keeps timing and literal multiline text on import/export without editing', () => {
    const rows = parseSrt(sample), back = parseSrt(writeSrt(rows));
    const semantic = (r: typeof rows) => r.map(({ text, startMs, endMs }) => ({ text, startMs, endMs }));
    expect(semantic(back)).toEqual(semantic(rows)); expect(rows[0].text).toBe('  きみと  \nKeep the light');
  });
  it('reads upstream incomplete markers and stops standard export', () => {
    const rows = parseSrt('1\n--:--,--- --> 00:02.000\n歌\n\n2\n00:02,000 --> --:--,---\n続き');
    expect(rows[0].startMs).toBeNull(); expect(rows[1].endMs).toBeNull(); expect(() => writeSrt(rows)).toThrow();
  });
  it('reads missing blank separators, timestamp dots and cue settings', () => {
    const rows = parseSrt('1\n00:00:01.000 --> 00:00:02.000 align:start\nfirst\n2\n00:00:03,000 --> 00:00:04,000\nsecond');
    expect(rows).toHaveLength(2); expect(rows[1].text).toBe('second');
  });
  it('detects malformed import instead of silently discarding blocks', () => {
    expect(() => parseSrt('1\n00:00:01,000 --> 00:00:02,000\ngood\n\n2\nBAD --> BAD\nlost')).toThrow();
    expect(() => parseSrt('not an SRT')).toThrow();
  });
  it('outputs optional BOM, excludes section tags and standardizes timestamps', () => {
    const row = { ...newRow('星'), startMs: 0, endMs: 1000 };
    expect(writeSrt([row], true)).toBe('\uFEFF1\n00:00:00,000 --> 00:00:01,000\n星\n');
  });
  it('uses integer precision for equal boundaries and detects nonadjacent overlaps', () => {
    const equal = [{ ...newRow('a'), startMs: 0, endMs: milliseconds(1.9999999) }, { ...newRow('b'), startMs: milliseconds(2), endMs: 3000 }];
    expect(validateRows(equal)).toEqual([]);
    const nested = [{ ...newRow('a'), startMs: 0, endMs: 10000 }, { ...newRow('b'), startMs: 1000, endMs: 2000 }, { ...newRow('c'), startMs: 3000, endMs: 4000 }];
    expect(validateRows(nested).filter(i => i.severity === 'warning')).toHaveLength(2);
  });
  it('permits intentional silence but blocks zero length and inverted cues', () => {
    expect(validateRows([{ ...newRow('a'), startMs: 0, endMs: 1000 }, { ...newRow('b'), startMs: 5000, endMs: 6000 }])).toEqual([]);
    expect(() => writeSrt([{ ...newRow('a'), startMs: 1000, endMs: 1000 }])).toThrow();
  });
  it('blocks blank lines inside a cue to avoid text loss during a standard SRT roundtrip', () => {
    expect(() => writeSrt([{ ...newRow('first\n\nsecond'), startMs: 0, endMs: 1000 }])).toThrow();
    expect(() => writeSrt([{ ...newRow('\nfirst'), startMs: 0, endMs: 1000 }])).toThrow();
  });
});
describe('project persistence', () => {
  it('roundtrips full state, sections, settings, IDs, flags and position without embedding media', () => {
    const p = newProject(), lyrics = '[Verse]\n星の夜\n[Chorus]\nHello'; Object.assign(p, parseLyrics(lyrics), { lyrics, audioFilename: 'STARLIGHT MODE.mp3' });
    p.selectedId = p.rows[0].id; p.activeId = p.rows[0].id; p.selectedIds = [p.rows[1].id]; p.rows[0].confirmed = true; p.rows[1].locked = true;
    const restored = parseProject(writeProject(p, 12501));
    expect(restored.rows).toEqual(p.rows); expect(restored.sections).toEqual(p.sections); expect(restored.settings).toEqual(p.settings);
    expect(restored.playbackPositionMs).toBe(12501); expect(restored.audioFilename).toBe(p.audioFilename); expect(Object.keys(restored)).not.toContain('audio');
  });
  it('restores without audio selected', () => expect(parseProject(writeProject(newProject(), 0)).audioFilename).toBeNull());
  it.each(['version', 'duplicate', 'negative', 'unknownRow', 'malformedSettings', 'badDate', 'fraction', 'badSource', 'badSection'])('rejects corrupt %s projects', kind => {
    const p = newProject(); p.rows = [newRow('歌')]; p.selectedId = p.rows[0].id;
    const bad = JSON.parse(writeProject(p, 0));
    if (kind === 'version') bad.schemaVersion = 2;
    if (kind === 'duplicate') bad.rows.push(bad.rows[0]);
    if (kind === 'negative') bad.rows[0].startMs = -1;
    if (kind === 'unknownRow') bad.selectedId = 'missing';
    if (kind === 'malformedSettings') bad.settings.playbackRate = null;
    if (kind === 'badDate') bad.savedAt = 'not-date';
    if (kind === 'fraction') bad.rows[0].endMs = 1.2;
    if (kind === 'badSource') bad.rows[0].source = 'evil';
    if (kind === 'badSection') bad.rows[0].sectionId = 'missing';
    expect(() => parseProject(JSON.stringify(bad))).toThrow();
  });
  it('preserves user filenames and only replaces filesystem-invalid characters', () => {
    expect(safeFilename('STARLIGHT MODE.srt', '.srt')).toBe('STARLIGHT MODE.srt');
    expect(safeFilename('曲名', '.synthia-srt.json')).toBe('曲名.synthia-srt.json');
    expect(safeFilename('a/b.srt', '.srt')).toBe('a_b.srt');
  });
});
