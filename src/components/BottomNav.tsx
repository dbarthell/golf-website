import { useLocation, useNavigate } from 'react-router-dom';
import { IconTargetArrow, IconLayoutList } from '@tabler/icons-react';

interface Tab {
  id: string;
  icon: React.ReactNode;
  path: string;
  /** Sub-paths that should highlight this tab */
  subPaths?: string[];
}

const TABS: Tab[] = [
  {
    id: 'putting',
    icon: <img src="images/zb-logo-new.jpg" alt="ZeroBreak" className="bottom-nav-logo" />,
    path: '/',
  },
  {
    id: 'wedges',
    icon: <IconTargetArrow size={24} stroke={1.75} />,
    path: '/wedges',
    subPaths: ['/wedges/calibrate'],
  },
  {
    id: 'bag',
    icon: <IconLayoutList size={24} stroke={1.75} />,
    path: '/bag',
    subPaths: ['/bag/edit'],
  },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  function isActive(tab: Tab): boolean {
    if (tab.path === '/') {
      // Only active if not on /wedges* or /bag*
      return (
        location.pathname === '/' ||
        location.pathname.startsWith('/calibrate') ||
        location.pathname.startsWith('/log') ||
        location.pathname.startsWith('/game')
      );
    }
    if (location.pathname === tab.path) return true;
    return tab.subPaths?.some(sub => location.pathname.startsWith(sub)) ?? false;
  }

  function handleTabClick(tab: Tab) {
    if (location.pathname === tab.path) {
      // Already on this tab — scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(tab.path);
    }
  }

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`bottom-nav-tab${isActive(tab) ? ' bottom-nav-tab--active' : ''}`}
          onClick={() => handleTabClick(tab)}
          aria-current={isActive(tab) ? 'page' : undefined}
        >
          {tab.icon}
        </button>
      ))}
    </nav>
  );
}
