import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route, Link } from 'react-router-dom';
import Layout from './src/components/Layout.jsx';
import Home from './src/pages/Home.jsx';
import Journey from './src/pages/Journey.jsx';
import Writing from './src/pages/Writing.jsx';
import Checkout from './src/pages/Checkout.jsx';
import Admin from './src/pages/Admin.jsx';
function NotFound() {
  return <main className="container section-space" id="main-content" tabIndex={-1}><h1 className="order-title">Page not found</h1><p className="section-description">This page does not exist.</p><Link className="text-link" to="/">Back to the book</Link></main>;
}
export function render(pathname) {
  return renderToString(<StaticRouter location={pathname}><Routes><Route element={<Layout />}>
    <Route index element={<Home />} /><Route path="journey" element={<Journey />} />
    <Route path="writing" element={<Writing />} /><Route path="order" element={<Checkout />} />
    <Route path="admin" element={<Admin />} /><Route path="*" element={<NotFound />} />
  </Route></Routes></StaticRouter>);
}
