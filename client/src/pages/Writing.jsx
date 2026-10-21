import { PageMeta } from '../components/Layout.jsx';
export default function Writing() {
  return <>
    <PageMeta title={"Articles & Poems — Shreya Pokharel"} description={"Read articles, essays, and original poems by Shreya Pokharel on justice, power, relationships, and feeling."} />
<main id="main-content" tabIndex="-1">
      <section className="grain">
        <div className="container section-space page-intro">
          <p className="section-label">beyond the book</p>
          <h1 className="page-title">Words on justice &amp; feeling</h1>
          <p className="page-description">My poems, stories and essays — where my questions as a law student meet my love of writing.</p>
        </div>
      </section>
      <section aria-labelledby="articles-heading" className="paper-section">
        <div className="container writing-layout">
          <div>
            <div className="writing-heading">
              <p className="section-label">01 / Published writing</p>
              <h2 id="articles-heading" className="section-heading">Articles</h2>
            </div>
            <div className="writing-list">
              <a href="https://www.nepalbahas.com/story/719964/2026/10/6/articles-prose/jai-hewan-jai-saitan" target="_blank" rel="noopener noreferrer" className="article-card"><p className="entry-meta">Nepal Bahas · October 2026</p>
<h3 className="article-title">Second Murder at Eleven? A Privileged Kid? Crime, Power, and the Absence of Punishment!</h3>
<p className="article-description">A sharp look at how privilege and power bend justice — and what happens when punishment never arrives.</p>
<span className="text-link article-link">Read article ↗</span></a>
              <a href="https://www.entertainlawyers.com/first-thing-pnc-law-faculty-taught-me-was-fear-not-of-failure-not-of-academics-but-of-being-seen/" target="_blank" rel="noopener noreferrer" className="article-card"><p className="entry-meta">Entertain Lawyers · Essay</p>
<h3 className="article-title">The First Thing PNC Law Faculty Taught Me Was Fear — Not of Failure, Not of Academics, but of Being Seen</h3>
<p className="article-description">My reflection on law school, visibility, and the fear of being seen.</p>
<span className="text-link article-link">Read article ↗</span></a>
            </div>
          </div>
          <div aria-labelledby="poems-heading" className="poems-column">
            <div className="writing-heading">
              <p className="section-label">02 / Poetry</p>
              <h2 id="poems-heading" className="section-heading">Poems</h2>
              <p className="poems-hint">Tap a title to open the poem.</p>
            </div>
            <div className="writing-list">
              <details className="poem-item">
                <summary className="poem-toggle">
                  <span className="poem-label"><span className="entry-meta">English</span><span lang="en" className="poem-title">Elegy for the One Who Ruined Me</span><span className="text-link poem-link">Read poem</span></span>
                  <span aria-hidden="true" className="poem-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="plus-icon" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg></span>
                </summary>
                <img src="/assets/poem-one.webp" alt="Elegy for the One Who Ruined Me" lang="en" className="poem-original" loading="lazy" decoding="async" width="953" height="1600"/>
              </details>
              <details className="poem-item">
                <summary className="poem-toggle">
                  <span className="poem-label"><span className="entry-meta">नेपाली</span><span lang="ne" className="poem-title">फेरि भेट्नलाई छुट्टिनु पर्छ</span><span className="text-link poem-link">Read poem</span></span>
                  <span aria-hidden="true" className="poem-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="plus-icon" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg></span>
                </summary>
                <img src="/assets/poem-nepali.webp" alt="फेरि भेट्नलाई छुट्टिनु पर्छ" lang="ne" className="poem-original" loading="lazy" decoding="async" width="905" height="1600"/>
              </details>
              <details className="poem-item">
                <summary className="poem-toggle">
                  <span className="poem-label"><span className="entry-meta">English</span><span lang="en" className="poem-title">Why I Love the Most Hated</span><span className="text-link poem-link">Read poem</span></span>
                  <span aria-hidden="true" className="poem-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewbox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="plus-icon" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg></span>
                </summary>
                <img src="/assets/poem-two.webp" alt="Why I Love the Most Hated" lang="en" className="poem-original" loading="lazy" decoding="async" width="906" height="1600"/>
              </details>
            </div>
          </div>
        </div>
      </section>
    </main>
    
  </>;
}
