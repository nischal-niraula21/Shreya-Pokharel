import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import ScrollReveal from './ScrollReveal.jsx';
const links = [['/', 'The Book'], ['/journey', 'My Journey'], ['/writing', 'Writing']];
export default function Layout() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (first.current) first.current = false;
    else document.querySelector('main')?.focus({ preventScroll: true });
  }, [pathname]);
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/">Shreya <span className="accent italic">Pokharel</span></Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([to, text]) => <NavLink key={to} className="nav-link" to={to} end>{text}</NavLink>)}
          <NavLink className="button button-primary button-small" to="/order">Order now</NavLink>
        </nav>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(([to, text]) => <NavLink key={to} className="nav-link" to={to} end>{text}</NavLink>)}
      </nav>
    </header>
    <ScrollReveal />
    <Outlet />
    <footer className="site-footer"><div className="footer-inner">
      <p className="footer-quote">“Some stories are harder to tell than others.”</p>
      <div className="footer-bottom"><p>© 2026 Shreya Pokharel</p></div>
    </div></footer>
  </>;
}
export { default as PageMeta } from './PageMeta.jsx';
