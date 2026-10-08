# SRT Tap Timer v1.64.2

SRT Tap Timer is a local browser-based tool for creating and editing SRT subtitle timing while listening to audio. It is designed especially for lyric subtitles, AI-generated SRT correction, simple subtitle video creation, and resumable project work.

SRT Tap Timer は、音源を聴きながら `R` / `E` キーで歌詞字幕の開始・終了タイミングを作成・修正できる、ローカル動作のブラウザ用SRT字幕エディターです。v1.57では、v1.56の作業保存・復元機能に加えて、Shift+Rで1つ前の字幕の終了時刻を現在行の開始時刻へ強制的に合わせる再編集ショートカットに対応しました。

## Main features

- Extract lyric lines from text with metadata tags.
- Load and re-edit existing SRT files.
- Tap subtitle timing with keyboard shortcuts.
- Save incomplete work using `--:--,---` draft timestamps.
- Save and restore SRT Tap Timer project JSON files.
- Display a local waveform preview around the current audio position.
- Directly edit the selected row's start, end, and subtitle text.
- Preview and create a simple subtitle WebM video.
- Export landscape video (16:9 / 1280×720) or short vertical video (9:16 / 720×1280).
- Convert generated WebM files to MP4 with the included ffmpeg BAT.
- Convert MP3 audio to WAV with the included ffmpeg BAT.

## Files

- `index.html` — SRT Tap Timer app.
- `USER_GUIDE.md` — full user guide and detailed operation manual.
- `CHANGELOG.md` — version history.
- `LICENSE` — MIT License.
- `convert_webm_to_mp4.bat` — drag-and-drop WebM to MP4 converter. Requires ffmpeg in PATH.
- `convert_mp3_to_wav.bat` — drag-and-drop MP3 to WAV converter. Requires ffmpeg in PATH.

## Project save / restore

Project JSON files save subtitle rows, text, current row, major editing settings, output names, and video export settings. They do not save the audio file, image file, generated WebM, waveform cache, or Undo history. After restoring a project, re-select the audio and image files if needed.

## Recommended environment

Use the latest Google Chrome or Microsoft Edge on Windows.

## Important video export note

During WebM creation, keep the browser tab in the foreground. If you switch tabs while recording, the browser may throttle canvas rendering. The output WebM may still be created with audio, but subtitles may be missing.

## Privacy

Files are processed locally in the browser. The app itself does not upload audio, lyrics, SRT, images, project JSON files, or generated videos to a server.

## License

MIT License.

Copyright (c) 2026 cityedge


## v1.62 note

v1.62 adds a tap input offset calibration modal. It plays click sounds every 0.5 seconds and alternates E/R targets; the recommended offset is calculated from the median of the latest 9 valid taps.


## v1.62.1 note

v1.62.2 fixes calibration key matching so E/R taps can be associated with the nearest recent same-key click, rather than only the currently highlighted key.


## v1.62.2 note

Calibration now matches key presses against the scheduled E/R timeline with both early and late timing windows, so early taps before the visual switch can be counted correctly.


## v1.63 note

v1.63 redesigns tap input offset calibration: it uses a generated HTMLAudioElement click track with low clicks every 0.5 seconds and a high target click every 2 seconds. Users press only R on the high clicks. The recommendation updates at valid tap counts 1/3/5/7/9, then uses the rolling median of the latest 9 valid taps.


## v1.63.1 note

v1.63.1 improves timestamp capture quality for tap input. R/W/Shift+R/Shift+W and E/Shift+E now read the adjusted media time before pushing the undo snapshot, so large subtitle sets cannot delay the moment at which `audio.currentTime` is captured.


## v1.64 note

v1.64 changes Shift+E to temporarily invert the current E input mode. If E is currently set to end the last row started by R, Shift+E ends the current row. If E is currently set to end the current row, Shift+E ends the last row started by R. The SRT output controls were also moved upward in the left pane, directly below lyric input and above audio file selection.


## v1.64.1 note

v1.64.1 improves right-pane lyric-cell editing. Double-clicking a row now seeks to that row's start time even when the editable lyric cell is focused. The right-pane lyric cell input handler also no longer trims and rewrites content during editing, preventing the caret from jumping to the beginning when typing English phrases with spaces.


## v1.64.2 note

v1.64.2 fixes adjacent-row overlap highlighting. The right-pane overlap warning now compares adjacent timestamps at the same displayed millisecond precision used by SRT formatting, preventing false red highlights when two adjacent timestamps display as equal but differ internally by a tiny floating-point amount.
