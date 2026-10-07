/* Lightweight Halloween effects — public storefront only. */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const selector = '.halloween-catalog .section-title, .halloween-catalog .product-card';
  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 })
    : null;
  const decorate = () => {
    document.querySelectorAll(selector).forEach(el => {
      if (el.dataset.halloweenAnimated) return;
      el.dataset.halloweenAnimated = 'true';
      if (observer) {
        el.classList.add('halloween-reveal');
        observer.observe(el);
      }
    });
  };
  decorate();
  const grid = document.getElementById('productsGrid');
  if (grid && 'MutationObserver' in window) {
    new MutationObserver(decorate).observe(grid, { childList: true, subtree: false });
  }
  let lastSpark = 0;
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' || Date.now() - lastSpark < 220) return;
    if (event.target.closest('input, textarea, select, .modal, .site-header')) return;
    lastSpark = Date.now();
    const spark = document.createElement('span');
    spark.className = 'halloween-spark';
    spark.textContent = ['✨', '🎃', '✦'][Math.floor(Math.random() * 3)];
    spark.setAttribute('aria-hidden', 'true');
    spark.style.left = (event.clientX - 10) + 'px';
    spark.style.top = (event.clientY - 10) + 'px';
    document.body.appendChild(spark);
    spark.addEventListener('animationend', () => spark.remove(), { once: true });
    setTimeout(() => spark.remove(), 1000);
  });
})();
