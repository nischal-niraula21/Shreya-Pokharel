import { useEffect, useRef, useState } from 'react';
const photos = [
  ['book-launch-poster.jpeg', 'Book launch invitation'],
  ['book-launch.jpeg', 'Shreya at her book launch'],
  ['book-sale-1.jpeg', 'Shreya with a reader holding the book'],
  ['bbook launch 2.jpeg', 'A moment at the book launch'],
  ['bbook launch 3.jpeg', 'Readers at the book launch'],
];
export default function LaunchGallery() {
  const ref = useRef(null), drag = useRef(null);
  const [position, setPosition] = useState(1);
  const stops = () => {
    const track = ref.current, slides = [...track.children], points = [];
    const end = Math.max(0, track.scrollWidth - track.clientWidth);
    slides.forEach((slide, index) => {
      const left = Math.min(end, slide.offsetLeft - slides[0].offsetLeft);
      const last = points.at(-1);
      if (last && Math.abs(last.left - left) < 2) last.index = index;
      else points.push({ left, index });
    });
    return points;
  };
  const nearest = points => points.reduce((best, item, index) =>
    Math.abs(item.left - ref.current.scrollLeft) < Math.abs(points[best].left - ref.current.scrollLeft) ? index : best, 0);
  const update = () => { const points = stops(); setPosition(points[nearest(points)].index + 1); };
  const go = direction => {
    const points = stops();
    const index = direction === 'first' ? 0 : direction === 'last' ? points.length - 1 : (nearest(points) + direction + points.length) % points.length;
    ref.current.scrollTo({ left: points[index].left, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  useEffect(() => { update(); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update); }, []);
  const endDrag = () => { drag.current = null; ref.current?.classList.remove('dragging'); };
  return <section className="launch-carousel" aria-label="Book launch photographs">
    <div ref={ref} className="launch-track" tabIndex={0} aria-label="Launch photographs. Swipe, drag or use the arrow keys to browse."
      onScroll={update} onKeyDown={event => {
        const direction = { ArrowLeft: -1, ArrowRight: 1, Home: 'first', End: 'last' }[event.key];
        if (direction !== undefined) { event.preventDefault(); go(direction); }
      }} onPointerDown={event => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        drag.current = { x: event.clientX, left: ref.current.scrollLeft };
        event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.classList.add('dragging');
      }} onPointerMove={event => { if (drag.current) ref.current.scrollLeft = drag.current.left - (event.clientX - drag.current.x); }}
      onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
      {photos.map(([src, alt], index) => <figure className="launch-slide" key={src} aria-label={`Photo ${index + 1} of ${photos.length}`}>
        <img src={`/assets/${src}`} alt={alt} className="launch-image" draggable={false} loading="lazy" decoding="async" />
      </figure>)}
    </div>
    <p className="slider-hint">Swipe or drag to explore the launch</p>
    <div className="launch-controls">
      <button className="gallery-arrow" type="button" onClick={() => go(-1)}>Previous</button>
      <p role="status" aria-live="polite">{position} / {photos.length}</p>
      <button className="gallery-arrow" type="button" onClick={() => go(1)}>Next</button>
    </div>
  </section>;
}
