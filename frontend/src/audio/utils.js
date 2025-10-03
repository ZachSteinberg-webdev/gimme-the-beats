export const dbToGain = (db) => Math.pow(10, db / 20);

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const nowSec = () => performance.now() / 1000;
