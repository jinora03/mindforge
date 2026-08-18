import type { AudioCueDefinition } from '@mindforge/engine';

function voice(id: string, url: string, description: string): AudioCueDefinition {
  return {
    id,
    bus: 'voice',
    source: { kind: 'url', url },
    defaultGain: 0.86,
    fadeIn: 0.018,
    fadeOut: 0.06,
    description,
  };
}

/**
 * Reference narration for the current production episodes. These are ordinary
 * URL-backed Voice-bus cues: replacing the files with a human/TTS recording
 * requires no timeline or Engine changes.
 */
export const NARRATION_AUDIO_CUES: readonly AudioCueDefinition[] = [
  voice('audio.voice.heat.hook', '/assets/audio/voice/heat/hook.mp3', 'Narration: Heat hook.'),
  voice('audio.voice.heat.enters', '/assets/audio/voice/heat/enters.mp3', 'Narration: information enters the engine.'),
  voice('audio.voice.heat.cost', '/assets/audio/voice/heat/cost.mp3', 'Narration: computation costs energy.'),
  voice('audio.voice.heat.answer', '/assets/audio/voice/heat/answer.mp3', 'Narration: computation releases heat.'),

  voice('audio.voice.prediction.hook', '/assets/audio/voice/prediction/hook.mp3', 'Narration: Prediction hook.'),
  voice('audio.voice.prediction.predict', '/assets/audio/voice/prediction/predict.mp3', 'Narration: self-touch prediction.'),
  voice('audio.voice.prediction.answer', '/assets/audio/voice/prediction/answer.mp3', 'Narration: unexpected touch answer.'),

  voice('audio.voice.skyBlue.hook', '/assets/audio/voice/sky-blue/hook.mp3', 'Narration: sky-blue hook.'),
  voice('audio.voice.skyBlue.carry', '/assets/audio/voice/sky-blue/carry.mp3', 'Narration: sunlight carries every colour.'),
  voice('audio.voice.skyBlue.scatter', '/assets/audio/voice/sky-blue/scatter.mp3', 'Narration: short wavelengths scatter.'),
  voice('audio.voice.skyBlue.answer', '/assets/audio/voice/sky-blue/answer.mp3', 'Narration: blue arrives from every direction.'),

  voice('audio.voice.coldBattery.hook', '/assets/audio/voice/cold-battery/hook.mp3', 'Narration: cold-battery hook.'),
  voice('audio.voice.coldBattery.flow', '/assets/audio/voice/cold-battery/flow.mp3', 'Narration: ions carry charge.'),
  voice('audio.voice.coldBattery.cold', '/assets/audio/voice/cold-battery/cold.mp3', 'Narration: cold slows ion motion.'),
  voice('audio.voice.coldBattery.answer', '/assets/audio/voice/cold-battery/answer.mp3', 'Narration: charge cannot leave quickly.'),
];
