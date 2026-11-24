// Language codes: normalizing YouTube codes and detecting a video's spoken language.

/** YouTube codes -> codes the Translator API expects. Drops regions except for Chinese script. */
export function normalizeLang(code: string): string {
  const lower = code.trim().toLowerCase();
  if (/^zh-(hant|tw|hk|mo)\b/.test(lower)) return 'zh-Hant';
  const base = lower.split(/[-_]/)[0] ?? '';
  if (base === 'iw') return 'he'; // YouTube still uses the old Hebrew code
  return base;
}

export const sameLanguage = (a: string, b: string) =>
  normalizeLang(a).split('-')[0] === normalizeLang(b).split('-')[0];

export interface AudioTrackInfo {
  id?: string; // e.g. "ru.4", "en-US.10"
  audioIsDefault?: boolean;
  isAutoDubbed?: boolean;
}

export interface PlayerLanguageData {
  streamingData?: { adaptiveFormats?: { audioTrack?: AudioTrackInfo }[] };
  captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: { languageCode: string; kind?: string }[] } };
}

function audioTrackLang(t: AudioTrackInfo): string | undefined {
  const code = t.id?.split('.')[0];
  return code && code !== 'und' ? normalizeLang(code) : undefined;
}

/**
 * The language people speak in the video, or undefined when unsure.
 * 1. Original audio track: the one YouTube did not auto-dub (default first).
 * 2. Otherwise the auto-generated (ASR) caption track, if there is exactly one
 *    after removing languages that only exist because of a dub.
 * ASR alone is not trusted when there are several: dubbed videos get ASR
 * tracks for the dub, and ASR sometimes guesses a wrong language.
 */
export function detectSpokenLanguage(resp: PlayerLanguageData): string | undefined {
  const audio = (resp.streamingData?.adaptiveFormats ?? []).flatMap((f) => (f.audioTrack ? [f.audioTrack] : []));
  const originals = audio.filter((t) => !t.isAutoDubbed);
  const original = originals.find((t) => t.audioIsDefault) ?? originals[0];
  const fromAudio = original && audioTrackLang(original);
  if (fromAudio) return fromAudio;

  const dubbed = new Set(audio.filter((t) => t.isAutoDubbed).flatMap((t) => audioTrackLang(t) ?? []));
  const asr = [
    ...new Set(
      (resp.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [])
        .filter((t) => t.kind === 'asr')
        .map((t) => normalizeLang(t.languageCode))
        .filter((l) => !dubbed.has(l)),
    ),
  ];
  return asr.length === 1 ? asr[0] : undefined;
}
