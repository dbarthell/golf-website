import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SLIDES = [
  {
    tag: 'The method',
    title: 'Find the straight putt',
    body: "H.A. Templeton's 1984 book Vector Putting proved that every breaking putt has a Zero Break Line — a straight downhill path through the hole. Imagine a clock face where 6 o'clock is straight downhill; no matter your ball's position, you always aim at a point on that 12 o'clock line — the straight putt. ZeroBreak finds that point for you.",
  },
  {
    tag: 'Your backstroke',
    title: 'Dial in your speed',
    body: "Aim is only half the equation. Traditional putting relies on instinct and athleticism to control speed — but instinct alone can't account for every variation in green speed, slope, and (yes) nerves, not without the reps of a tour professional. ZeroBreak takes a scientific approach: it calibrates the length of your backstroke to the length of the putt, tuned to your unique tempo. Build a feel for a few key distances, and you'll find you can step up to any putt with confidence. We've found it's the most reliable way to nail the right speed, every single time.",
  },
  {
    tag: 'Make it yours',
    title: 'Calibrate once',
    body: 'No two putting strokes are alike. Some give it a good pop, others are slow and deliberate. Calibrate your stroke to a single distance (10 ft is a good starting point) and the app uses your personal acceleration profile to calculate every other distance automatically.',
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
