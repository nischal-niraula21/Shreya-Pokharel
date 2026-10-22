import { Link } from 'react-router-dom';
import { PageMeta } from '../components/Layout.jsx';
import LaunchGallery from '../components/LaunchGallery.jsx';

export default function Journey() {
  return (
    <>
      <PageMeta
        title="My Journey — Shreya Pokharel"
        description="Meet Shreya Pokharel, a law student and writer from Jhapa, Nepal. Follow her journey through law, poetry, and publishing her debut novel."
      />

      <main id="main-content" tabIndex="-1">
        <section className="grain">
          <div className="journey-intro-inner">
            <p className="section-label">my journey</p>

            <h1 className="journey-title">
              Between the law and the ink
            </h1>

            <p className="journey-intro-text">
              I’m Shreya, a law student and writer from Jhapa, Nepal.
              I’m still figuring out where life will take me, but studying
              law and writing have become two parts of that journey I
              care deeply about. Here’s a little of the person behind
              the pages.
            </p>
          </div>
        </section>

        <section
          className="journey-chapter"
          aria-labelledby="chapter-1"
        >
          <div className="journey-chapter-inner">
            <header className="journey-chapter-heading">
              <p className="section-label">Chapter I</p>
              <h2 id="chapter-1">Roots in Jhapa</h2>
            </header>

            <figure className="journey-photo">
              <img
                src="/assets/shreya-3.jpeg"
                alt="Roots in Jhapa"
                width="960"
                height="1280"
                loading="lazy"
                decoding="async"
              />
            </figure>

            <div className="journey-chapter-copy">
              <p>
                Jhapa is home to me. Alongside my studies, I love
                writing poems and stories, especially when there’s
                something on my mind that I can’t quite explain in
                conversation. Putting it into words doesn’t always
                come easily, but I enjoy trying. Sometimes, writing
                helps me understand what I’m feeling too.
              </p>
            </div>
          </div>
        </section>

        <section
          className="journey-chapter paper-section"
          aria-labelledby="chapter-2"
        >
          <div className="journey-chapter-inner">
            <header className="journey-chapter-heading">
              <p className="section-label">Chapter II</p>
              <h2 id="chapter-2">Choosing the law</h2>
            </header>

            <figure className="journey-photo">
              <img
                src="/assets/shreya-5.jpeg"
                alt="Choosing the law"
                width="1600"
                height="1066"
                loading="lazy"
                decoding="async"
              />
            </figure>

            <div className="journey-chapter-copy">
              <p>
                I began studying law in my +2 and am now pursuing
                my BA LL.B. at Prithvi Narayan Campus in Pokhara.
                There’s still so much for me to learn. The awards
                and academic recognition I’ve received along the
                way mean a lot to me, and they encourage me to
                keep putting in the work.
              </p>
            </div>
          </div>
        </section>

        <section
          className="journey-chapter"
          aria-labelledby="chapter-3"
        >
          <div className="journey-chapter-inner">
            <header className="journey-chapter-heading">
              <p className="section-label">Chapter III</p>
              <h2 id="chapter-3">Expressing through ink</h2>
            </header>

            <figure className="journey-photo">
              <img
                src="/assets/shreya-2.jpeg"
                alt="Expressing through ink"
                width="1468"
                height="1599"
                loading="lazy"
                decoding="async"
              />
            </figure>

            <div className="journey-chapter-copy">
              <p>
                Some things become a poem; others need a whole
                story. I also write articles about questions that
                stay with me, including justice, power, and the
                way we treat one another. I don’t always begin
                with an answer. Often, I write because I’m
                trying to understand something, and I hope
                someone reading it might recognise a little
                of their own experience.
              </p>
            </div>
          </div>
        </section>

        <section
          className="journey-chapter paper-section"
          aria-labelledby="chapter-4"
        >
          <div className="journey-chapter-inner">
            <header className="journey-chapter-heading">
              <p className="section-label">Chapter IV</p>
              <h2 id="chapter-4">Why this book</h2>
            </header>

            <figure className="journey-photo">
              <img
                src="/assets/shreya-4.jpeg"
                alt="Why this book"
                width="960"
                height="1280"
                loading="lazy"
                decoding="async"
              />
            </figure>

            <div className="journey-chapter-copy">
              <p>
                <em>And They Say It’s Easy</em> is my debut novel.
                It explores relationships, trauma, and the
                difficulty of finding your way through life
                when things aren’t as simple as they seem to
                others. These are subjects I wanted to give
                time and attention to. Sharing the book feels
                personal, and I hope its readers find room
                to feel, reflect, and understand its characters
                in their own way.
              </p>
            </div>
          </div>
        </section>

        <section className="launch-section">
          <div className="container section-space">
            <div className="text-center">
              <p className="section-label">the launch</p>

              <h2 className="section-heading">
                17 October 2026 · Bhadrapur, Jhapa
              </h2>

              <p className="launch-description">
                On 17 October 2026, I shared{' '}
                <em>And They Say It’s Easy</em> with readers
                at its launch in Bhadrapur, Jhapa. Having
                people come together for my first book meant
                so much to me. Thank you to everyone who
                was part of that day. Here are a few moments
                I’m glad to have captured.
              </p>
            </div>

            <LaunchGallery />

            <div className="launch-cta">
              <Link className="button button-primary" to="/order">
                Order the book
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}