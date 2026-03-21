import { useState, useEffect } from 'react';
import { IconWalk } from '@tabler/icons-react';

const STORAGE_KEY = 'zerobreak-walkoff-tip-dismissed';

export function WalkOffTip() {
  const [dismissed] = useState(() => !!localStorage.getItem(STORAGE_KEY));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  if (!visible || dismissed) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  return (
    <>
      <div className="walkoff-backdrop" onClick={dismiss} />
      <div className="walkoff-sheet">
        <div className="walkoff-sheet-handle" />
        <div className="walkoff-sheet-icon"><IconWalk size={40} /></div>
        <h3 className="walkoff-sheet-title">Walk it off</h3>
        <p className="walkoff-sheet-body">
          Not sure how far you are from the hole? Walk it off —{' '}
          <strong>1 normal step ≈ 3 ft</strong>. Practice your stride with a
          ZeroBreak Yardstick or tape measure to dial it in.
        </p>
        <button className="walkoff-sheet-btn" onClick={dismiss}>Got it</button>
      </div>
    </>
  );
}
