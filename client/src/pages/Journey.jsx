import { Link } from 'react-router-dom';
import { PageMeta } from '../components/Layout.jsx';
import LaunchGallery from '../components/LaunchGallery.jsx';
export default function Journey() {
  return <>
    <PageMeta title={"My Journey — Shreya Pokharel"} description={"Meet Shreya Pokharel, a law student and writer from Jhapa, Nepal. Follow her journey through law, poetry, and publishing her debut novel."} />
<main id="main-content" tabIndex="-1">
    <section className="grain">
      <div className="journey-intro-inner">
        <p className="section-label">my journey</p>
        <h1 className="journey-title">Between the law and the ink</h1>
        <p className="journey-intro-text">I’m a law student and writer from Jhapa, Nepal. Here is a little of my journey
          through law, poetry, and the publication of my debut novel.</p>
      </div>
    </section>
    <section className="journey-chapter" aria-labelledby="chapter-1">
      <div className="journey-chapter-inner">
        <header className="journey-chapter-heading">
          <p className="section-label">Chapter I</p>
          <h2 id="chapter-1">Roots in Jhapa</h2>
        </header>
        <figure className="journey-photo">
          <img src="/assets/shreya-3.jpeg" alt="Roots in Jhapa" width="960" height="1280" loading="lazy" decoding="async"/>
        </figure>
        <div className="journey-chapter-copy">
          <p>I’m from Jhapa, Nepal. Alongside my studies, I love writing poems and stories — finding ways to express my
            feelings through ink.</p>
        </div>
      </div>
    </section>
    <section className="journey-chapter paper-section" aria-labelledby="chapter-2">
      <div className="journey-chapter-inner">
        <header className="journey-chapter-heading">
          <p className="section-label">Chapter II</p>
          <h2 id="chapter-2">Choosing the law</h2>
        </header>
        <figure className="journey-photo">
          <img src="/assets/shreya-5.jpeg" alt="Choosing the law" width="1600" height="1066" loading="lazy" decoding="async"/>
        </figure>
        <div className="journey-chapter-copy">
          <p>I studied law in my +2 and am now pursuing my BA LL.B. at Prithvi Narayan Campus in Pokhara. Along the way,
            my work in this field has earned me awards and academic recognition.</p>
        </div>
      </div>
    </section>
    <section className="journey-chapter" aria-labelledby="chapter-3">
      <div className="journey-chapter-inner">
        <header className="journey-chapter-heading">
          <p className="section-label">Chapter III</p>
          <h2 id="chapter-3">Expressing through ink</h2>
        </header>
        <figure className="journey-photo">
          <img src="/assets/shreya-2.jpeg" alt="Expressing through ink" width="1468" height="1599" loading="lazy" decoding="async"/>
        </figure>
        <div className="journey-chapter-copy">
          <p>Law is my field of study; writing is another part of my life. I write poems, stories and articles,
            exploring feelings as well as questions of justice, power and the world around me.</p>
        </div>
      </div>
    </section>
    <section className="journey-chapter paper-section" aria-labelledby="chapter-4">
      <div className="journey-chapter-inner">
        <header className="journey-chapter-heading">
          <p className="section-label">Chapter IV</p>
          <h2 id="chapter-4">Why this book</h2>
        </header>
        <figure className="journey-photo">
          <img src="/assets/shreya-4.jpeg" alt="Why this book" width="960" height="1280" loading="lazy" decoding="async"/>
        </figure>
        <div className="journey-chapter-copy">
          <p>And They Say It’s Easy explores navigating life, relationships and trauma. Publishing my debut novel marks
            a new chapter in my writing journey. The poems, stories and articles I love writing now share a home with
            this book.</p>
        </div>
      </div>
    </section>
    <section className="launch-section">
      <div className="container section-space">
        <div className="text-center">
          <p className="section-label">the launch</p>
          <h2 className="section-heading">17 October 2026 · Bhadrapur, Jhapa</h2>
          <p className="launch-description">A new chapter in my writing journey: the launch of And They Say It’s Easy in
            Bhadrapur, Jhapa. These are a few moments with my book and the readers sharing in its publication.</p>
        </div>
        <LaunchGallery /><div className="launch-cta">
          <Link className="button button-primary" to="/order">Order the book</Link>
        </div>
      </div>
    </section>
  </main>
  
  </>;
}
