import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Scrolls the window to the top on every route change.
// Mounted once inside <Router>, has no visual output.
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
