import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollReveal() {
    const { pathname } = useLocation();

    useEffect(() => {
        if (
            ['/order', '/admin'].includes(pathname) ||
            !('IntersectionObserver' in window) ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }

        let observer;
        let elements = [];

        const frame = requestAnimationFrame(() => {
            elements = Array.from(
                document.querySelectorAll(`
          .journey-chapter-heading,
          .journey-photo,
          .journey-chapter-copy,
          main > section:not(.home-hero):not(.journey-chapter) > div,
          main > section.container,
          .footer-inner
        `)
            );

            // Avoid animating both a container and its children.
            elements = elements.filter(
                element =>
                    !elements.some(
                        parent => parent !== element && parent.contains(element)
                    )
            );

            observer = new IntersectionObserver(
                entries => {
                    entries.forEach(entry => {
                        if (!entry.isIntersecting) return;

                        entry.target.classList.add('is-revealed');
                        observer.unobserve(entry.target);
                    });
                },
                {
                    threshold: 0,
                    rootMargin: '0px 0px -100px 0px',
                }
            );

            elements.forEach(element => {
                // Keep content already on screen immediately visible.
                if (element.getBoundingClientRect().top < window.innerHeight) {
                    return;
                }

                element.classList.add('scroll-reveal');
                observer.observe(element);
            });
        });

        return () => {
            cancelAnimationFrame(frame);
            observer?.disconnect();

            elements.forEach(element => {
                element.classList.remove('scroll-reveal', 'is-revealed');
            });
        };
    }, [pathname]);

    return null;
}