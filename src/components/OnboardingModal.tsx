import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SLIDES = [
  {
    tag: 'The method',
    title: 'Find the straight putt',
    body: "H.A. Templeton's 1984 book Vector Putting proved that every breaking putt has a Zero Break Line — a straight downhill path through the hole. Imagine a clock face where 6 o'clock is straight downhill; no matter your ball's position, you always aim at a point on that 12 o'clock line — the straight putt — and let gravity do the rest. ZeroBreak finds that point for you.",
  },
  {
    tag: 'Your backstroke',
    title: 'Dial in your speed',
    body: "Traditional putting relies on instinct and athleticism to control speed — but instinct alone can't account for every variation in green speed, slope, and (yes) nerves, not without the reps of a tour professional. ZeroBreak takes a scientific approach: it calibrates the length of your backstroke to the length of the putt, tuned to your unique tempo. Build a feel for a few key distances, and you'll find you can step up to any putt with confidence. We've found it's the most reliable way to nail the right speed, every single time.",
  },
  {
    tag: 'Make it yours',
    title: 'Calibrate once',
    body: 'No two putting strokes are alike. Some give it a good pop, others are slow and deliberate. Calibrate your stroke to a single distance (10 ft is a good starting point) and the app uses your personal acceleration profile to calculate every other distance automatically.',
  },
];

interface Props {
  onDismiss: () => void;
  isReplay?: boolean;
}

export function OnboardingModal({ onDismiss, isReplay = false }: Props) {
  const [current, setCurrent] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const navigate = useNavigate();
  const touchStartX = useRef<number | null>(null);
  const isLast = current === SLIDES.length - 1;
  const slide = SLIDES[current];

  function dismiss() {
    if (!isReplay) localStorage.setItem('zerobreak-onboarded', '1');
    onDismiss();
  }

  function handleNext() {
    if (isLast) {
      if (!isReplay) localStorage.setItem('zerobreak-onboarded', '1');
      isReplay ? onDismiss() : navigate('/calibrate?from=onboarding');
    } else {
      setCurrent(c => c + 1);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.touches[0].clientX - touchStartX.current;
    if ((delta > 0 && current === 0) || (delta < 0 && isLast)) {
      setDragOffset(delta * 0.2);
    } else {
      setDragOffset(delta);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    setDragging(false);
    setDragOffset(0);
    if (Math.abs(delta) < 40) return;
    if (delta < 0 && !isLast) {
      setCurrent(c => c + 1);
    } else if (delta > 0 && current > 0) {
      setCurrent(c => c - 1);
    }
  }

  const slideStyle = {
    transform: `translateX(${dragOffset}px)`,
    transition: dragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
  };

  return (
    <div className="onboarding-overlay">
      <div
        className="onboarding-slides"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="onboarding-slide" style={slideStyle}>
          <div className="onboarding-tag">{slide.tag}</div>
          <h2 className="onboarding-title">{slide.title}</h2>
          <p className="onboarding-body">{slide.body}</p>
        </div>
      </div>

      <div className="onboarding-dots">
        {SLIDES.map((_, i) => (
          <span key={i} className={`dot${i === current ? ' dot-active' : ''}`} />
        ))}
      </div>

      <div className="onboarding-actions">
        <button className="onboarding-next" onClick={handleNext}>
          {isLast ? (isReplay ? 'Done' : 'Get Started') : 'Next'}
        </button>
        {(isLast || isReplay) && (
          <button className="onboarding-skip" onClick={dismiss}>
            {isReplay ? 'Close' : 'Skip for now'}
          </button>
        )}
      </div>
    </div>
  );
}
