import type { AudioCueDefinition, AudioPcmData } from '@mindforge/engine';
import productionAssets from './production-assets.json';
import { deterministicNoise, envelope, equalPowerPan, expDecay, stereo, TAU } from './production-dsp';

function gardenAmbience(sampleRate: number): AudioPcmData {
  const duration = 6;
  const leftNoise = deterministicNoise(0x6d696e64);
  const rightNoise = deterministicNoise(0x67617264);
  let leftAir = 0;
  let rightAir = 0;
  return stereo(sampleRate, duration, (time) => {
    leftAir += (leftNoise() - leftAir) * 0.012;
    rightAir += (rightNoise() - rightAir) * 0.012;
    const breezeL = leftAir * (0.075 + 0.018 * Math.sin(TAU * 0.11 * time));
    const breezeR = rightAir * (0.075 + 0.018 * Math.sin(TAU * 0.09 * time + 1.2));
    const bed = Math.sin(TAU * 146.83 * time) * 0.006 + Math.sin(TAU * 220 * time) * 0.004;
    const chirpPhase = time % 2.8;
    const chirpEnv = chirpPhase < 0.24 ? envelope(chirpPhase, 0.24, 0.02, 0.16) : 0;
    const chirp = Math.sin(TAU * (1180 + chirpPhase * 680) * time) * chirpEnv * 0.018;
    return [breezeL + bed + chirp * 0.55, breezeR + bed * 0.8 + chirp];
  });
}

function factoryAmbience(sampleRate: number): AudioPcmData {
  const duration = 4;
  const leftNoise = deterministicNoise(0x66616374);
  const rightNoise = deterministicNoise(0x6f727931);
  let leftAir = 0;
  let rightAir = 0;
  return stereo(sampleRate, duration, (time) => {
    leftAir += (leftNoise() - leftAir) * 0.016;
    rightAir += (rightNoise() - rightAir) * 0.014;
    const hum = Math.sin(TAU * 48 * time) * 0.055 + Math.sin(TAU * 96 * time) * 0.016;
    const motor = Math.sin(TAU * (132 + 5 * Math.sin(TAU * 0.42 * time)) * time) * 0.015;
    const clankPhase = time % 1.73;
    const clankEnv = clankPhase < 0.09 ? expDecay(clankPhase, 35) : 0;
    const clank = Math.sin(TAU * 610 * time) * clankEnv * 0.025;
    return [hum + motor + leftAir * 0.035 + clank, hum * 0.93 + motor * 0.8 + rightAir * 0.035 + clank * 0.55];
  });
}

function informationPing(sampleRate: number): AudioPcmData {
  const duration = 0.58;
  return stereo(sampleRate, duration, (time) => {
    const env = envelope(time, duration, 0.004, 0.28) * expDecay(time, 3.3);
    const body =
      Math.sin(TAU * 704 * time) * 0.18 +
      Math.sin(TAU * 1056 * time) * 0.095 +
      Math.sin(TAU * 1408 * time) * 0.035;
    const echoTime = Math.max(0, time - 0.12);
    const echo = time >= 0.12 ? Math.sin(TAU * 880 * echoTime) * expDecay(echoTime, 6) * 0.055 : 0;
    return [(body + echo * 0.35) * env, (body * 0.82 + echo) * env];
  });
}

function handWhoosh(sampleRate: number): AudioPcmData {
  const duration = 0.68;
  const noise = deterministicNoise(0x68616e64);
  let low = 0;
  let previousLow = 0;
  return stereo(sampleRate, duration, (time) => {
    const raw = noise();
    low += (raw - low) * (0.045 + time * 0.11);
    const band = low - previousLow * 0.72;
    previousLow = low;
    const env = envelope(time, duration, 0.065, 0.18);
    const pan = -0.72 + 1.44 * (time / duration);
    const [lPan, rPan] = equalPowerPan(pan);
    const sweep = Math.sin(TAU * (95 + 360 * time) * time) * 0.035;
    const signal = (band * 0.48 + sweep) * env;
    return [signal * lPan, signal * rPan];
  });
}

function touchTick(sampleRate: number): AudioPcmData {
  const duration = 0.24;
  const noise = deterministicNoise(0x746f7563);
  return stereo(sampleRate, duration, (time) => {
    const click = noise() * expDecay(time, 70) * 0.19;
    const softBody = Math.sin(TAU * (280 - 90 * time) * time) * expDecay(time, 18) * 0.16;
    const sparkle = Math.sin(TAU * 1220 * time) * expDecay(time, 22) * 0.055;
    const env = envelope(time, duration, 0.002, 0.08);
    return [(click + softBody + sparkle * 0.55) * env, (click * 0.72 + softBody + sparkle) * env];
  });
}

function reactionBurst(sampleRate: number): AudioPcmData {
  const duration = 0.62;
  const noiseL = deterministicNoise(0x72656163);
  const noiseR = deterministicNoise(0x74696f6e);
  let airL = 0;
  let airR = 0;
  return stereo(sampleRate, duration, (time) => {
    airL += (noiseL() - airL) * 0.12;
    airR += (noiseR() - airR) * 0.12;
    const thump = Math.sin(TAU * (155 - 82 * time) * time) * expDecay(time, 7.5) * 0.28;
    const snap = Math.sin(TAU * 760 * time) * expDecay(time, 19) * 0.08;
    const airEnv = envelope(time, duration, 0.012, 0.22) * expDecay(time, 4.2);
    return [thump + snap * 0.6 + airL * airEnv * 0.12, thump * 0.94 + snap + airR * airEnv * 0.12];
  });
}

function machineStart(sampleRate: number): AudioPcmData {
  const duration = 1.16;
  const noise = deterministicNoise(0x6d616368);
  let grit = 0;
  let phase = 0;
  return stereo(sampleRate, duration, (time) => {
    const normalized = time / duration;
    const freq = 58 + 245 * normalized * normalized;
    phase += (TAU * freq) / sampleRate;
    grit += (noise() - grit) * 0.07;
    const env = envelope(time, duration, 0.025, 0.18);
    const motor = Math.sin(phase) * 0.19 + Math.sin(phase * 2.01) * 0.065 + Math.sin(phase * 3.98) * 0.025;
    const startup = noise() * expDecay(time, 25) * 0.09;
    const texture = grit * (0.03 + normalized * 0.055);
    return [(motor + startup + texture) * env, (motor * 0.96 + startup * 0.7 - texture * 0.7) * env];
  });
}

function machinePulse(sampleRate: number): AudioPcmData {
  const duration = 0.46;
  const noise = deterministicNoise(0x70756c73);
  return stereo(sampleRate, duration, (time) => {
    const env = envelope(time, duration, 0.003, 0.17) * expDecay(time, 5.8);
    const body = Math.sin(TAU * (138 - 58 * time) * time) * 0.28;
    const click = noise() * expDecay(time, 38) * 0.08;
    const overtone = Math.sin(TAU * 414 * time) * expDecay(time, 12) * 0.055;
    return [(body + click + overtone * 0.6) * env, (body + click * 0.65 + overtone) * env];
  });
}

function heatRelease(sampleRate: number): AudioPcmData {
  const duration = 1.18;
  const noiseL = deterministicNoise(0x68656174);
  const noiseR = deterministicNoise(0x73746561);
  let steamL = 0;
  let steamR = 0;
  return stereo(sampleRate, duration, (time) => {
    steamL += (noiseL() - steamL) * 0.22;
    steamR += (noiseR() - steamR) * 0.2;
    const env = envelope(time, duration, 0.006, 0.38) * expDecay(time, 2.15);
    const boom = Math.sin(TAU * (92 - 33 * time) * time) * expDecay(time, 5.2) * 0.26;
    const hissRise = Math.min(1, time / 0.08);
    const hiss = hissRise * env * 0.22;
    return [boom + steamL * hiss, boom * 0.94 + steamR * hiss];
  });
}

function insightChime(sampleRate: number): AudioPcmData {
  const duration = 1.28;
  return stereo(sampleRate, duration, (time) => {
    const env = envelope(time, duration, 0.004, 0.5) * expDecay(time, 1.85);
    const root = Math.sin(TAU * 523.25 * time) * 0.135;
    const third = Math.sin(TAU * 659.25 * time) * 0.105;
    const fifth = Math.sin(TAU * 783.99 * time) * 0.08;
    const shimmer = Math.sin(TAU * 1567.98 * time) * 0.022;
    const delayed = time > 0.145 ? Math.sin(TAU * 1046.5 * (time - 0.145)) * expDecay(time - 0.145, 3.7) * 0.05 : 0;
    return [(root + third + fifth * 0.6 + shimmer + delayed * 0.35) * env, (root + third * 0.78 + fifth + shimmer * 0.75 + delayed) * env];
  });
}


function labAmbience(sampleRate: number): AudioPcmData {
  const duration = 5;
  const leftNoise = deterministicNoise(0x6c616231);
  const rightNoise = deterministicNoise(0x6c616232);
  let leftAir = 0;
  let rightAir = 0;
  return stereo(sampleRate, duration, (time) => {
    leftAir += (leftNoise() - leftAir) * 0.012;
    rightAir += (rightNoise() - rightAir) * 0.012;
    const ventilation = Math.sin(TAU * 61 * time) * 0.018 + Math.sin(TAU * 122 * time) * 0.006;
    const electronic = Math.sin(TAU * (232 + 2.5 * Math.sin(TAU * 0.21 * time)) * time) * 0.008;
    const tickPhase = time % 2.35;
    const tick = tickPhase < 0.035 ? Math.sin(TAU * 870 * tickPhase) * expDecay(tickPhase, 55) * 0.018 : 0;
    return [ventilation + electronic + leftAir * 0.025 + tick, ventilation * 0.94 + electronic * 0.72 + rightAir * 0.025 + tick * 0.55];
  });
}

function classroomAmbience(sampleRate: number): AudioPcmData {
  const duration = 6;
  const leftNoise = deterministicNoise(0x636c6173);
  const rightNoise = deterministicNoise(0x73726f6f);
  let leftAir = 0;
  let rightAir = 0;
  return stereo(sampleRate, duration, (time) => {
    leftAir += (leftNoise() - leftAir) * 0.01;
    rightAir += (rightNoise() - rightAir) * 0.01;
    const air = Math.sin(TAU * 54 * time) * 0.012;
    const distant = Math.sin(TAU * 210 * time) * 0.003 + Math.sin(TAU * 314 * time) * 0.002;
    const rustlePhase = time % 3.1;
    const rustleEnv = rustlePhase < 0.42 ? envelope(rustlePhase, 0.42, 0.05, 0.24) : 0;
    return [air + distant + leftAir * (0.024 + rustleEnv * 0.024), air * 0.9 + distant * 0.8 + rightAir * (0.024 + rustleEnv * 0.021)];
  });
}

function kitchenAmbience(sampleRate: number): AudioPcmData {
  const duration = 5;
  const leftNoise = deterministicNoise(0x6b697463);
  const rightNoise = deterministicNoise(0x68656e31);
  let leftAir = 0;
  let rightAir = 0;
  return stereo(sampleRate, duration, (time) => {
    leftAir += (leftNoise() - leftAir) * 0.013;
    rightAir += (rightNoise() - rightAir) * 0.013;
    const fridge = Math.sin(TAU * 49 * time) * 0.022 + Math.sin(TAU * 98 * time) * 0.006;
    const room = Math.sin(TAU * 170 * time) * 0.003;
    const clinkPhase = time % 2.87;
    const clinkEnv = clinkPhase < 0.12 ? expDecay(clinkPhase, 24) : 0;
    const clink = Math.sin(TAU * 880 * time) * clinkEnv * 0.014;
    return [fridge + room + leftAir * 0.022 + clink, fridge * 0.92 + room * 0.75 + rightAir * 0.022 + clink * 0.7];
  });
}

function materialTap(sampleRate: number): AudioPcmData {
  const duration = 0.42;
  const noise = deterministicNoise(0x6d617461);
  return stereo(sampleRate, duration, (time) => {
    const env = envelope(time, duration, 0.002, 0.15);
    const click = noise() * expDecay(time, 62) * 0.11;
    const ring = Math.sin(TAU * 980 * time) * expDecay(time, 12) * 0.12;
    const body = Math.sin(TAU * 245 * time) * expDecay(time, 8) * 0.09;
    return [(click + ring + body) * env, (click * 0.68 + ring * 0.82 + body) * env];
  });
}

function balloonRub(sampleRate: number): AudioPcmData {
  const duration = 0.95;
  const noiseL = deterministicNoise(0x62616c31);
  const noiseR = deterministicNoise(0x62616c32);
  let softL = 0;
  let softR = 0;
  return stereo(sampleRate, duration, (time) => {
    softL += (noiseL() - softL) * 0.18;
    softR += (noiseR() - softR) * 0.17;
    const pulse = 0.55 + 0.45 * Math.sin(TAU * 5.2 * time) ** 2;
    const env = envelope(time, duration, 0.045, 0.18);
    return [softL * env * pulse * 0.15, softR * env * pulse * 0.15];
  });
}

function staticCrackle(sampleRate: number): AudioPcmData {
  const duration = 0.72;
  const noiseL = deterministicNoise(0x73746131);
  const noiseR = deterministicNoise(0x73746132);
  return stereo(sampleRate, duration, (time, index) => {
    const gateA = ((index * 1103515245 + 12345) >>> 0) % 997 < 7 ? 1 : 0;
    const gateB = ((index * 1664525 + 1013904223) >>> 0) % 769 < 5 ? 1 : 0;
    const env = envelope(time, duration, 0.003, 0.16) * expDecay(time, 1.4);
    const sparkL = noiseL() * gateA * 0.22;
    const sparkR = noiseR() * gateB * 0.22;
    const whine = Math.sin(TAU * (1380 + 420 * time) * time) * 0.018;
    return [(sparkL + whine) * env, (sparkR + whine * 0.65) * env];
  });
}

function waterSplash(sampleRate: number): AudioPcmData {
  const duration = 0.86;
  const noiseL = deterministicNoise(0x77617431);
  const noiseR = deterministicNoise(0x77617432);
  let lowL = 0;
  let lowR = 0;
  return stereo(sampleRate, duration, (time) => {
    lowL += (noiseL() - lowL) * 0.2;
    lowR += (noiseR() - lowR) * 0.2;
    const env = envelope(time, duration, 0.004, 0.28) * expDecay(time, 2.5);
    const plop = Math.sin(TAU * (118 - 48 * time) * time) * expDecay(time, 7.2) * 0.18;
    const droplets = Math.sin(TAU * 1180 * time) * expDecay(time, 13) * 0.035;
    return [plop + lowL * env * 0.11 + droplets, plop * 0.93 + lowR * env * 0.11 + droplets * 0.72];
  });
}

function heatTransfer(sampleRate: number): AudioPcmData {
  const duration = 1.45;
  const noise = deterministicNoise(0x68656131);
  let hiss = 0;
  let phase = 0;
  return stereo(sampleRate, duration, (time) => {
    hiss += (noise() - hiss) * 0.09;
    const normalized = time / duration;
    const freq = 165 + 260 * normalized;
    phase += (TAU * freq) / sampleRate;
    const env = envelope(time, duration, 0.05, 0.35);
    const rise = Math.sin(phase) * (0.045 + normalized * 0.035);
    const shimmer = Math.sin(TAU * 890 * time) * expDecay(time, 1.2) * 0.018;
    const air = hiss * env * (0.03 + normalized * 0.045);
    return [(rise + shimmer + air) * env, (rise * 0.92 + shimmer * 0.72 - air * 0.6) * env];
  });
}



function roadAmbience(sampleRate: number): AudioPcmData {
  const duration = 5;
  const noiseL = deterministicNoise(0x726f6131);
  const noiseR = deterministicNoise(0x726f6132);
  let rumbleL = 0;
  let rumbleR = 0;
  return stereo(sampleRate, duration, (time) => {
    rumbleL += (noiseL() - rumbleL) * 0.025;
    rumbleR += (noiseR() - rumbleR) * 0.023;
    const engine = Math.sin(TAU * 68 * time) * 0.026 + Math.sin(TAU * 136 * time) * 0.008;
    const tires = Math.sin(TAU * (92 + 3 * Math.sin(TAU * 0.33 * time)) * time) * 0.008;
    return [engine + tires + rumbleL * 0.036, engine * 0.94 + tires * 0.82 + rumbleR * 0.036];
  });
}

function beltLatch(sampleRate: number): AudioPcmData {
  const duration = 0.38;
  const noise = deterministicNoise(0x62656c74);
  return stereo(sampleRate, duration, (time) => {
    const click = noise() * expDecay(time, 58) * 0.13;
    const metal = Math.sin(TAU * 1210 * time) * expDecay(time, 20) * 0.08;
    const body = Math.sin(TAU * 310 * time) * expDecay(time, 12) * 0.08;
    const env = envelope(time, duration, 0.002, 0.12);
    return [(click + metal + body) * env, (click * 0.68 + metal * 0.85 + body) * env];
  });
}

function brakeImpact(sampleRate: number): AudioPcmData {
  const duration = 0.78;
  const noiseL = deterministicNoise(0x62726131);
  const noiseR = deterministicNoise(0x62726132);
  let skidL = 0;
  let skidR = 0;
  return stereo(sampleRate, duration, (time) => {
    skidL += (noiseL() - skidL) * 0.14;
    skidR += (noiseR() - skidR) * 0.14;
    const thump = Math.sin(TAU * (105 - 42 * time) * time) * expDecay(time, 6.0) * 0.25;
    const skidEnv = envelope(time, duration, 0.008, 0.24) * expDecay(time, 2.0);
    return [thump + skidL * skidEnv * 0.12, thump * 0.94 + skidR * skidEnv * 0.12];
  });
}

function dropRelease(sampleRate: number): AudioPcmData {
  const duration = 0.28;
  return stereo(sampleRate, duration, (time) => {
    const env = envelope(time, duration, 0.002, 0.09);
    const click = Math.sin(TAU * 540 * time) * expDecay(time, 20) * 0.08;
    const tick = Math.sin(TAU * 980 * time) * expDecay(time, 28) * 0.045;
    return [(click + tick * 0.6) * env, (click * 0.86 + tick) * env];
  });
}

function dropImpact(sampleRate: number): AudioPcmData {
  const duration = 0.52;
  const noise = deterministicNoise(0x64726f70);
  return stereo(sampleRate, duration, (time) => {
    const body = Math.sin(TAU * (125 - 48 * time) * time) * expDecay(time, 7.2) * 0.2;
    const grit = noise() * expDecay(time, 24) * 0.07;
    const env = envelope(time, duration, 0.002, 0.16);
    return [(body + grit) * env, (body * 0.95 + grit * 0.7) * env];
  });
}

function paperLaunch(sampleRate: number): AudioPcmData {
  const duration = 0.72;
  const noiseL = deterministicNoise(0x70617031);
  const noiseR = deterministicNoise(0x70617032);
  let airL = 0;
  let airR = 0;
  return stereo(sampleRate, duration, (time) => {
    airL += (noiseL() - airL) * 0.11;
    airR += (noiseR() - airR) * 0.11;
    const env = envelope(time, duration, 0.025, 0.18) * expDecay(time, 1.25);
    const swish = Math.sin(TAU * (150 + 260 * time) * time) * 0.025;
    return [(airL * 0.12 + swish) * env, (airR * 0.12 + swish * 0.72) * env];
  });
}

function airflow(sampleRate: number): AudioPcmData {
  const duration = 1.6;
  const noiseL = deterministicNoise(0x61697231);
  const noiseR = deterministicNoise(0x61697232);
  let bandL = 0;
  let bandR = 0;
  return stereo(sampleRate, duration, (time) => {
    bandL += (noiseL() - bandL) * 0.08;
    bandR += (noiseR() - bandR) * 0.08;
    const env = envelope(time, duration, 0.08, 0.28);
    const whistle = Math.sin(TAU * (320 + 42 * Math.sin(TAU * 0.45 * time)) * time) * 0.014;
    return [(bandL * 0.085 + whistle) * env, (bandR * 0.085 + whistle * 0.8) * env];
  });
}

function magnetSnap(sampleRate: number): AudioPcmData {
  const duration = 0.48;
  const noise = deterministicNoise(0x6d616731);
  return stereo(sampleRate, duration, (time) => {
    const snap = noise() * expDecay(time, 48) * 0.12;
    const ring = Math.sin(TAU * 720 * time) * expDecay(time, 14) * 0.10;
    const low = Math.sin(TAU * 180 * time) * expDecay(time, 9) * 0.08;
    const env = envelope(time, duration, 0.002, 0.14);
    return [(snap + ring + low) * env, (snap * 0.7 + ring * 0.88 + low) * env];
  });
}


function canyonAmbience(sampleRate: number): AudioPcmData {
  const duration = 6;
  const noiseL = deterministicNoise(0x63616e31);
  const noiseR = deterministicNoise(0x63616e32);
  let windL = 0;
  let windR = 0;
  return stereo(sampleRate, duration, (time) => {
    windL += (noiseL() - windL) * 0.025;
    windR += (noiseR() - windR) * 0.023;
    const gust = 0.025 + 0.018 * (0.5 + 0.5 * Math.sin(TAU * 0.14 * time));
    const tone = Math.sin(TAU * 72 * time) * 0.004;
    return [windL * gust + tone, windR * gust + tone * 0.8];
  });
}

function echoImpulse(sampleRate: number): AudioPcmData {
  const duration = 0.42;
  const noise = deterministicNoise(0x65636831);
  return stereo(sampleRate, duration, (time) => {
    const env = envelope(time, duration, 0.002, 0.11);
    const snap = noise() * expDecay(time, 52) * 0.13;
    const body = Math.sin(TAU * 340 * time) * expDecay(time, 12) * 0.12;
    return [(snap + body) * env, (snap * 0.72 + body) * env];
  });
}

function echoReturn(sampleRate: number): AudioPcmData {
  const duration = 0.62;
  const noise = deterministicNoise(0x65636832);
  return stereo(sampleRate, duration, (time) => {
    const env = envelope(time, duration, 0.004, 0.2) * expDecay(time, 3.0);
    const body = Math.sin(TAU * 300 * time) * 0.08;
    const air = noise() * 0.025;
    return [(body + air) * env * 0.72, (body * 0.9 + air) * env];
  });
}

function rainAmbience(sampleRate: number): AudioPcmData {
  const duration = 5;
  const noiseL = deterministicNoise(0x72616931);
  const noiseR = deterministicNoise(0x72616932);
  let bedL = 0;
  let bedR = 0;
  return stereo(sampleRate, duration, (time) => {
    bedL += (noiseL() - bedL) * 0.18;
    bedR += (noiseR() - bedR) * 0.18;
    const hush = 0.045 + 0.008 * Math.sin(TAU * 0.21 * time);
    const dropPhase = time % 0.71;
    const drop = dropPhase < 0.025 ? Math.sin(TAU * 1180 * dropPhase) * expDecay(dropPhase, 58) * 0.018 : 0;
    return [bedL * hush + drop, bedR * hush + drop * 0.6];
  });
}

function prismSplit(sampleRate: number): AudioPcmData {
  const duration = 0.92;
  return stereo(sampleRate, duration, (time) => {
    const env = envelope(time, duration, 0.004, 0.28) * expDecay(time, 2.4);
    const sweep = Math.sin(TAU * (430 + time * 620) * time) * 0.08;
    const shimmer = Math.sin(TAU * 1280 * time) * 0.035 + Math.sin(TAU * 1660 * time) * 0.02;
    return [(sweep + shimmer * 0.65) * env, (sweep * 0.82 + shimmer) * env];
  });
}

function nightAmbience(sampleRate: number): AudioPcmData {
  const duration = 6;
  const noiseL = deterministicNoise(0x6e696731);
  const noiseR = deterministicNoise(0x6e696732);
  let airL = 0;
  let airR = 0;
  return stereo(sampleRate, duration, (time) => {
    airL += (noiseL() - airL) * 0.009;
    airR += (noiseR() - airR) * 0.009;
    const breeze = 0.022 + 0.006 * Math.sin(TAU * 0.1 * time);
    const insectPhase = time % 2.6;
    const insect = insectPhase < 0.12 ? Math.sin(TAU * 2400 * insectPhase) * expDecay(insectPhase, 14) * 0.006 : 0;
    return [airL * breeze + insect, airR * breeze + insect * 0.75];
  });
}

function compareTick(sampleRate: number): AudioPcmData {
  const duration = 0.36;
  return stereo(sampleRate, duration, (time) => {
    const env = envelope(time, duration, 0.002, 0.1);
    const a = Math.sin(TAU * 660 * time) * expDecay(time, 14) * 0.07;
    const b = Math.sin(TAU * 990 * time) * expDecay(time, 20) * 0.035;
    return [(a + b * 0.6) * env, (a * 0.82 + b) * env];
  });
}

function observatoryAmbience(sampleRate: number): AudioPcmData {
  const duration = 6;
  const noiseL = deterministicNoise(0x6f627331);
  const noiseR = deterministicNoise(0x6f627332);
  let airL = 0;
  let airR = 0;
  return stereo(sampleRate, duration, (time) => {
    airL += (noiseL() - airL) * 0.01;
    airR += (noiseR() - airR) * 0.01;
    const motor = Math.sin(TAU * 43 * time) * 0.012 + Math.sin(TAU * 86 * time) * 0.004;
    const wind = 0.018 + 0.004 * Math.sin(TAU * 0.12 * time + 0.8);
    return [motor + airL * wind, motor * 0.93 + airR * wind];
  });
}

function twinkle(sampleRate: number): AudioPcmData {
  const duration = 0.52;
  return stereo(sampleRate, duration, (time) => {
    const env = envelope(time, duration, 0.003, 0.15) * expDecay(time, 3.3);
    const high = Math.sin(TAU * 1320 * time) * 0.05;
    const upper = Math.sin(TAU * 1760 * time) * 0.028;
    return [(high + upper * 0.55) * env, (high * 0.8 + upper) * env];
  });
}

const PRODUCTION_CUE_IDS = new Set<string>(productionAssets.productionCueIds);

function productionCue(
  id: string,
  filename: string,
  render: (sampleRate: number) => AudioPcmData,
  defaultGain: number,
  description: string,
  options: { loop?: boolean; fadeIn?: number; fadeOut?: number } = {},
): AudioCueDefinition {
  return {
    id,
    bus: id.startsWith('audio.ambience.') ? 'ambience' : 'sfx',
    source: { kind: 'procedural', render },
    preferredSource: PRODUCTION_CUE_IDS.has(id)
      ? { kind: 'url', url: `/assets/audio/${id.startsWith('audio.ambience.') ? 'ambience' : 'sfx'}/${filename}.mp3` }
      : undefined,
    defaultGain,
    loop: options.loop,
    fadeIn: options.fadeIn,
    fadeOut: options.fadeOut,
    description,
  };
}

/**
 * Production-oriented defaults. Real MP3 assets at the preferred URLs win
 * automatically; the deterministic stereo renderers remain high-quality-enough
 * fallbacks for a fresh clone and for tests.
 */
export const DEFAULT_AUDIO_CUES: readonly AudioCueDefinition[] = [
  productionCue('audio.ambience.garden', 'garden', gardenAmbience, 0.48, 'Outdoor breeze/room tone.', {
    loop: true,
    fadeIn: 0.3,
    fadeOut: 0.35,
  }),
  productionCue('audio.ambience.factory', 'factory', factoryAmbience, 0.5, 'Low workshop and machinery room tone.', {
    loop: true,
    fadeIn: 0.25,
    fadeOut: 0.35,
  }),
  productionCue('audio.ambience.lab', 'lab', labAmbience, 0.42, 'Quiet science-lab ventilation and instrument room tone.', {
    loop: true,
    fadeIn: 0.25,
    fadeOut: 0.35,
  }),
  productionCue('audio.ambience.classroom', 'classroom', classroomAmbience, 0.40, 'Soft classroom air and subtle distant movement.', {
    loop: true,
    fadeIn: 0.25,
    fadeOut: 0.35,
  }),
  productionCue('audio.ambience.kitchen', 'kitchen', kitchenAmbience, 0.42, 'Warm kitchen appliance and room tone.', {
    loop: true,
    fadeIn: 0.25,
    fadeOut: 0.35,
  }),
  productionCue('audio.ambience.road', 'road', roadAmbience, 0.44, 'Vehicle cabin road and tire ambience.', { loop: true, fadeIn: 0.2, fadeOut: 0.3 }),
  productionCue('audio.ambience.canyon', 'canyon', canyonAmbience, 0.42, 'Open canyon wind and distant room tone.', { loop: true, fadeIn: 0.2, fadeOut: 0.3 }),
  productionCue('audio.ambience.rain', 'rain', rainAmbience, 0.44, 'Reusable steady rain bed.', { loop: true, fadeIn: 0.2, fadeOut: 0.3 }),
  productionCue('audio.ambience.night', 'night', nightAmbience, 0.36, 'Quiet night overlook ambience.', { loop: true, fadeIn: 0.25, fadeOut: 0.35 }),
  productionCue('audio.ambience.observatory', 'observatory', observatoryAmbience, 0.38, 'Night air plus subtle observatory mechanism hum.', { loop: true, fadeIn: 0.25, fadeOut: 0.35 }),
  productionCue('audio.sfx.information', 'information', informationPing, 0.7, 'Glassy information/data accent.', { fadeIn: 0.004, fadeOut: 0.08 }),
  productionCue('audio.sfx.handWhoosh', 'hand-whoosh', handWhoosh, 0.78, 'Directional external-hand approach whoosh.', { fadeIn: 0.012, fadeOut: 0.1 }),
  productionCue('audio.sfx.touch', 'touch', touchTick, 0.75, 'Soft tactile contact transient.', { fadeIn: 0.002, fadeOut: 0.055 }),
  productionCue('audio.sfx.reaction', 'reaction', reactionBurst, 0.82, 'Body-led playful reaction accent.', { fadeIn: 0.002, fadeOut: 0.15 }),
  productionCue('audio.sfx.machineStart', 'machine-start', machineStart, 0.76, 'Layered mechanical spin-up.', { fadeIn: 0.01, fadeOut: 0.13 }),
  productionCue('audio.sfx.machinePulse', 'machine-pulse', machinePulse, 0.76, 'Mechanical/core pulse.', { fadeIn: 0.002, fadeOut: 0.11 }),
  productionCue('audio.sfx.heatRelease', 'heat-release', heatRelease, 0.82, 'Pressure release with low impact and steam tail.', { fadeIn: 0.004, fadeOut: 0.24 }),
  productionCue('audio.sfx.materialTap', 'material-tap', materialTap, 0.70, 'Reusable material sample tap/ring.', { fadeIn: 0.002, fadeOut: 0.12 }),
  productionCue('audio.sfx.balloonRub', 'balloon-rub', balloonRub, 0.62, 'Rubbery balloon charging texture.', { fadeIn: 0.02, fadeOut: 0.16 }),
  productionCue('audio.sfx.staticCrackle', 'static-crackle', staticCrackle, 0.72, 'Short static-electric crackle.', { fadeIn: 0.002, fadeOut: 0.14 }),
  productionCue('audio.sfx.waterSplash', 'water-splash', waterSplash, 0.76, 'Compact water drop/splash accent.', { fadeIn: 0.002, fadeOut: 0.2 }),
  productionCue('audio.sfx.heatTransfer', 'heat-transfer', heatTransfer, 0.64, 'Rising thermal/conduction accent.', { fadeIn: 0.02, fadeOut: 0.28 }),
  productionCue('audio.sfx.beltLatch', 'belt-latch', beltLatch, 0.72, 'Seatbelt latch click.', { fadeIn: 0.002, fadeOut: 0.1 }),
  productionCue('audio.sfx.brakeImpact', 'brake-impact', brakeImpact, 0.82, 'Sudden braking and restraint impact accent.', { fadeIn: 0.002, fadeOut: 0.2 }),
  productionCue('audio.sfx.dropRelease', 'drop-release', dropRelease, 0.62, 'Drop rig release click.', { fadeIn: 0.002, fadeOut: 0.08 }),
  productionCue('audio.sfx.dropImpact', 'drop-impact', dropImpact, 0.72, 'Compact object landing impact.', { fadeIn: 0.002, fadeOut: 0.16 }),
  productionCue('audio.sfx.paperLaunch', 'paper-launch', paperLaunch, 0.68, 'Paper glider launch swish.', { fadeIn: 0.01, fadeOut: 0.16 }),
  productionCue('audio.sfx.airflow', 'airflow', airflow, 0.50, 'Airflow/wing movement texture.', { fadeIn: 0.04, fadeOut: 0.25 }),
  productionCue('audio.sfx.magnetSnap', 'magnet-snap', magnetSnap, 0.72, 'Magnetic attraction snap.', { fadeIn: 0.002, fadeOut: 0.14 }),
  productionCue('audio.sfx.echoImpulse', 'echo-impulse', echoImpulse, 0.72, 'Dry sound impulse sent into a reflective space.', { fadeIn: 0.002, fadeOut: 0.1 }),
  productionCue('audio.sfx.echoReturn', 'echo-return', echoReturn, 0.60, 'Softer delayed echo return.', { fadeIn: 0.004, fadeOut: 0.18 }),
  productionCue('audio.sfx.prismSplit', 'prism-split', prismSplit, 0.66, 'Optical split/reveal shimmer.', { fadeIn: 0.003, fadeOut: 0.22 }),
  productionCue('audio.sfx.compareTick', 'compare-tick', compareTick, 0.58, 'Short comparison marker tick.', { fadeIn: 0.002, fadeOut: 0.1 }),
  productionCue('audio.sfx.twinkle', 'twinkle', twinkle, 0.54, 'Short high-frequency twinkle accent.', { fadeIn: 0.002, fadeOut: 0.14 }),
  productionCue('audio.sfx.insight', 'insight', insightChime, 0.68, 'Warm answer/reveal chime.', { fadeIn: 0.003, fadeOut: 0.34 }),
];
