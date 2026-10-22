import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import Layout, { PageMeta } from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Journey from './pages/Journey.jsx';
import Writing from './pages/Writing.jsx';
import Checkout from './pages/Checkout.jsx';
import Admin from './pages/Admin.jsx';
import './styles.css';
function NotFound() { return <><PageMeta /><main className="container section-space" id="main-content" tabIndex={-1}><h1 className="order-title">Page not found</h1><p className="section-description">This page does not exist.</p><Link className="text-link" to="/">Back to the book</Link></main></>; }
mountApp(<React.StrictMode><BrowserRouter><Routes><Route element={<Layout />}>
  <Route index element={<Home />} /><Route path="journey" element={<Journey />} /><Route path="writing" element={<Writing />} /><Route path="order" element={<Checkout />} /><Route path="admin" element={<Admin />} />
  {[['index.html', '/'], ['journey.html', '/journey'], ['writing.html', '/writing'], ['order.html', '/order'], ['admin.html', '/admin']].map(([from, to]) => <Route key={from} path={from} element={<Navigate to={to} replace />} />)}
  <Route path="*" element={<NotFound />} />
</Route></Routes></BrowserRouter></React.StrictMode>);

function mountApp(element) {
  const root = document.getElementById('root');
  if (root.dataset.prerendered === 'true') hydrateRoot(root, element);
  else createRoot(root).render(element);
}
