import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SLIDES = [
  {
    tag: 'The method',
    title: 'Find the straight putt',
    body: "H.A. Templeton's 1984 book Vector Putting showed that every breaking putt has a Zero Break Line — a straight path that follows the slope downhill through the hole. Aim at a point on that line above the hole, and gravity does the rest. ZeroBreak calculates that point for you.",
  },
  {
    tag: 'Your backswing',
    title: 'Dial in your speed',
    body: "Aim is only half the equation. ZeroBreak also maps your backswing to every distance on the course, calibrated to your own stroke. Build a feel for a few key distances, and you'll find you can step up to any putt with confidence. We've found it's the most reliable way to nail the right speed, every single time.",
  },
  {
    tag: 'Make it yours',
    title: 'Calibrate once',
    body: 'The length of your backswing combined with your natural tempo is what determines how far the ball rolls. Calibrate your backswing to a single distance — 10 ft is a good starting point — and the app applies your acceleration profile to every other distance automatically.',
  },
];

interface Props {
  onDismiss: () => void;
}

export function OnboardingModal({ onDismiss }: Props) {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const isLast = current === SLIDES.length - 1;
  const slide = SLIDES[current];

  function dismiss() {
    localStorage.setItem('zerobreak-onboarded', '1');
    onDismiss();
  }

  function handleNext() {
    if (isLast) {
      localStorage.setItem('zerobreak-onboarded', '1');
      navigate('/calibrate?from=onboarding');
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
