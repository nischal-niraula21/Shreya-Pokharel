import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { PageMeta } from '../components/Layout.jsx';
export default function Home() {
  useEffect(() => {
    fetch('/api/health', {
      cache: 'no-store',
    }).catch(() => {
      // A failed warm-up must not interrupt the homepage.
    });
  }, []);
  return <>
    <PageMeta title={"And They Say It's Easy — a novel by Shreya Pokharel"} description={"And They Say It’s Easy, the debut novel by Shreya Pokharel. Explore the book, meet the author, and order your copy."} />
    <main id="main-content" tabIndex="-1">
      <section className="grain home-hero">
        <div className="container hero-layout">
          <div>
            <p className="hero-eyebrow rise">A debut novel</p>
            <h1 className="hero-title rise-2">And they say it's <span className="accent italic">easy</span>.</h1>
            <p className="hero-description rise-3">My debut novel about navigating life, relationships, trauma and the
              weight behind the words we so easily say.</p>
            <div className="button-row rise-3">
              <Link className="button button-primary" to="/order">Order your copy</Link>
              <a className="button button-outline" href="https://www.instagram.com/pokharel_s?obrf=cTN1ajFwbHpoYThk" target="_blank" rel="noopener noreferrer">Get in touch</a>
            </div>
          </div>
          <div className="hero-cover">
            <img src="/assets/book-cover.jpeg" alt="Cover of And They Say It's Easy by Shreya Pokharel" className="book-cover rise-2" width="1024" height="1536" decoding="async" fetchPriority="high" />
            <span className="cover-note cover-note-left">you're fine</span>
            <span className="cover-note cover-note-right">move on</span>
          </div>
        </div>
      </section>
      <section className="paper-section book-about">
        <div className="container section-space narrow text-center">
          <p className="section-label">about the book</p>
          <h2 className="section-heading">The words we're told to swallow</h2>
          <p className="book-description"><em>And They Say It’s Easy</em> explores life, relationships, trauma and the
            weight behind words that can be so easy to say. In my debut novel, I turn toward difficult feelings, inviting
            you to pause and look beyond the surface.</p>
          <div className="theme-tags">
            <span className="theme-tag">be strong</span>
            <span className="theme-tag">you're fine</span>
            <span className="theme-tag">move on</span>
            <span className="theme-tag">it's easy</span>
            <span className="theme-tag">stop being too sensitive</span>
          </div>
        </div>
      </section>
      <section className="container section-space">
        <div className="quote-grid">
          <blockquote className="book-quote">"Some stories are harder to tell than others."</blockquote>
          <blockquote className="book-quote">"Everyone told her it was easy. Nobody asked what it cost her."<cite className="quote-cite">— From my book cover</cite>
          </blockquote>
          <blockquote className="book-quote">"Healing is not the absence of pain — it is learning to carry it differently."
          </blockquote>
        </div>
      </section>
      <section className="author-intro">
        <div className="container section-space author-layout">
          <img src="/assets/shreya-11.jpeg" alt="Shreya Pokharel" className="author-photo" width="1600" height="1600" decoding="async" loading="lazy" />
          <div>
            <p className="section-label">a little about me</p>
            <h2 className="section-heading">Between the law <br />and the lines.</h2>
            <p className="author-description">I’m Shreya Pokharel, a writer and law student from Jhapa, Nepal. I studied law
              in my +2 and am now pursuing my BA LL.B. at Prithvi Narayan Campus in Pokhara. My academic journey has
              brought me awards and recognition, while poetry and stories have given me a way to express my feelings
              through ink.</p>
            <Link className="text-link journey-link" to="/journey">Read my journey →</Link>
          </div>
        </div>
      </section>
      <section className="grain closing-section">
        <div className="container section-space narrow text-center">
          <h2 className="section-heading">Hold my story in your hands.</h2>
          <p className="section-description">A novel by Shreya Pokharel.</p>
          <Link className="button button-primary closing-button" to="/order">Order now</Link>
        </div>
      </section>
    </main>

  </>;
}
