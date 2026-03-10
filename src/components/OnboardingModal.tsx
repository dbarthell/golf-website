import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SLIDES = [
  {
    tag: 'The method',
    title: 'Aim above the hole',
    body: "H.A. Templeton's 1984 book Vector Putting showed that every breaking putt has a Zero Break Line — a straight path that follows the slope downhill through the hole. Aim at a point on that line above the hole, and gravity curves the ball right in. ZeroBreak calculates that point for you.",
  },
  {
    tag: 'Your backswing',
    title: 'Trail foot landmarks',
    body: 'Vector Putting gives you the line. Distance control is the other half of the equation. That means having a reliable way to repeat the same backswing length every time. Your trail foot gives you three built-in landmarks — inside edge, middle, and outside edge — that map to short, mid, and longer putts. With a fixed physical anchor and consistent effort, backswing length becomes the one variable that controls how far the ball goes.',
  },
  {
    tag: 'Make it yours',
    title: 'Calibrate once',
    body: 'When you apply the same acceleration profile every time — constant effort, consistent cadence — backswing length is what controls distance. Calibrate once and every distance adjusts to your natural pace.',
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
