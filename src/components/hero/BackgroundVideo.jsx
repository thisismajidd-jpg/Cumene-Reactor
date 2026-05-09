import React, { useEffect, useRef } from 'react';

/**
 * Looping background video with a custom requestAnimationFrame-driven
 * crossfade — *no* CSS transitions on opacity. Translates the FadingVideo
 * spec from the reference (Cinematic Space-Travel Landing Page).
 *
 *   • starts at opacity 0, fades to 1 on `loadeddata`
 *   • on `timeupdate`: when (duration − currentTime) ≤ 0.55 s, fade to 0
 *   • on `ended`: snap opacity 0, rewind, play, fade to 1
 *   • each fadeTo() call cancels the previous rAF so fades chain cleanly
 *
 * `loop` attribute is intentionally OFF — looping is implemented manually
 * in `ended` so the fade-out has time to finish before the loop restarts.
 */
const FADE_MS = 500;
const FADE_OUT_LEAD = 0.55; // seconds before video ends

export default function BackgroundVideo({
  src,
  poster,
  className = '',
  style,
  ...rest
}) {
  const videoRef = useRef(null);
  const rafRef = useRef(0);
  const fadingOutRef = useRef(false);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    // Initialize transparent.
    vid.style.opacity = '0';
    fadingOutRef.current = false;

    const fadeTo = (target, duration = FADE_MS) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Resume from wherever the previous fade left off.
      const start = parseFloat(vid.style.opacity || '0');
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / duration);
        vid.style.opacity = String(start + (target - start) * t);
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const onLoadedData = () => {
      vid.style.opacity = '0';
      // Some browsers reject autoplay without user gesture — swallow safely.
      vid.play().catch(() => {});
      fadeTo(1);
    };

    const onTimeUpdate = () => {
      if (!Number.isFinite(vid.duration)) return;
      if (fadingOutRef.current) return;
      const remaining = vid.duration - vid.currentTime;
      if (remaining > 0 && remaining <= FADE_OUT_LEAD) {
        fadingOutRef.current = true;
        fadeTo(0);
      }
    };

    const onEnded = () => {
      vid.style.opacity = '0';
      // Small delay before rewinding so the previous fade finishes painting.
      setTimeout(() => {
        try {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        } catch {
          /* ignore */
        }
        fadingOutRef.current = false;
        fadeTo(1);
      }, 100);
    };

    vid.addEventListener('loadeddata', onLoadedData);
    vid.addEventListener('timeupdate', onTimeUpdate);
    vid.addEventListener('ended', onEnded);

    return () => {
      vid.removeEventListener('loadeddata', onLoadedData);
      vid.removeEventListener('timeupdate', onTimeUpdate);
      vid.removeEventListener('ended', onEnded);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      autoPlay
      muted
      playsInline
      preload="auto"
      crossOrigin="anonymous"
      className={className}
      // Inline opacity is owned by the rAF fader — don't overwrite it from CSS.
      style={{ opacity: 0, ...style }}
      {...rest}
    />
  );
}
