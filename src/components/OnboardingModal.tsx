import { useState } from 'react';

const SLIDES = [
  {
    tag: 'The method',
    title: 'Aim above the hole',
    body: 'Every breaking putt has a Zero Break Line — a straight path above the hole where gravity will curve the ball in. ZeroBreak finds that line for you based on distance and slope.',
  },
  {
    tag: 'Your backswing',
    title: 'Trail foot landmarks',
    body: 'Backswing distance is anchored to your trail foot, 12 inches right of the ball. Inside foot, middle, and outside foot map to short, mid, and longer putts.',
  },
  {
    tag: 'Make it yours',
    title: 'Calibrate once',
    body: 'Every stroke is different. A quick calibration adjusts the distances to match your actual putting speed — so the numbers work for you, not a textbook.',
  },
];

interface Props {
  onDismiss: () => void;
}

export function OnboardingModal({ onDismiss }: Props) {
  const [current, setCurrent] = useState(0);
  const isLast = current === SLIDES.length - 1;
  const slide = SLIDES[current];

  function dismiss() {
    localStorage.setItem('zerobreak-onboarded', '1');
    onDismiss();
  }

  function handleNext() {
    if (isLast) {
      dismiss();
    } else {
      setCurrent(c => c + 1);
    }
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-slides">
        <div className="onboarding-slide">
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
          {isLast ? 'Get Started' : 'Next'}
        </button>
        {isLast && (
          <button className="onboarding-skip" onClick={dismiss}>
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
