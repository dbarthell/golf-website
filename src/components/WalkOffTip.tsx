import { useState } from 'react';

const STORAGE_KEY = 'zerobreak-walkoff-tip-dismissed';

export function WalkOffTip() {
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem(STORAGE_KEY),
  );

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  }

  return (
    <div className="walkoff-tip">
      <span className="walkoff-tip-icon">💡</span>
      <p className="walkoff-tip-text">
        Walk off your putts — 1 step ≈ 3 ft. Practice your stride with a ZeroBreak ruler or tape measure to dial it in.
      </p>
      <button className="walkoff-tip-dismiss" onClick={dismiss} aria-label="Dismiss tip">✕</button>
    </div>
  );
}
