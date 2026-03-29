/**
 * TatianaGlen Product Page JS
 * Handles: gallery, accordion, quantity stepper, variant selection
 */

(function () {
  'use strict';

  /* =========================================================
     TGPGallery — thumbnail + main image switcher with fade
  ========================================================= */
  class TGPGallery {
    constructor(section) {
      this.section = section;
      this.mainImg = section.querySelector('[data-tgp-main-img]');
      this.thumbs = section.querySelectorAll('[data-tgp-thumb]');
      this.currentIndex = 0;

      if (!this.mainImg || !this.thumbs.length) return;

      this.thumbs.forEach((thumb, i) => {
        thumb.addEventListener('click', () => this.switchTo(i));
        thumb.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.switchTo(i);
          }
        });
        thumb.setAttribute('tabindex', '0');
        thumb.setAttribute('role', 'button');
      });
    }

    switchTo(index, src) {
      if (index === this.currentIndex && !src) return;

      const thumb = this.thumbs[index];
      const newSrc = src || (thumb && thumb.getAttribute('data-src'));
      if (!newSrc) return;

      // Fade out
      this.mainImg.style.opacity = '0';
      this.mainImg.style.transition = 'opacity 0.3s ease';

      setTimeout(() => {
        this.mainImg.src = newSrc;

        // Hi-res srcset if available
        const srcset = thumb && thumb.getAttribute('data-srcset');
        if (srcset) this.mainImg.srcset = srcset;

        this.mainImg.onload = () => {
          this.mainImg.style.opacity = '1';
        };
        // Fallback if already cached
        if (this.mainImg.complete) this.mainImg.style.opacity = '1';
      }, 150);

      // Active state on thumbs
      this.thumbs.forEach((t, i) => {
        t.classList.toggle('is-active', i === index);
        t.setAttribute('aria-pressed', i === index ? 'true' : 'false');
      });

      this.currentIndex = index;
    }

    syncToVariant(variantId, images) {
      if (!images || !images.length) return;
      const match = images.find((img) => img.variant_ids && img.variant_ids.includes(variantId));
      if (!match) return;

      // Find thumb index that matches this image src
      const thumbIndex = Array.from(this.thumbs).findIndex(
        (t) => t.getAttribute('data-src') && t.getAttribute('data-src').includes(match.src.split('?')[0].split('/').pop().split('.')[0])
      );

      if (thumbIndex >= 0) {
        this.switchTo(thumbIndex);
      } else {
        this.switchTo(0, match.src);
      }
    }
  }

  /* =========================================================
     TGPTabs — horizontal tab nav switching
  ========================================================= */
  class TGPTabs {
    constructor(section) {
      this.btns   = section.querySelectorAll('[data-tgp-tab-btn]');
      this.panels = section.querySelectorAll('[data-tgp-tab-panel]');

      if (!this.btns.length) return;

      this.btns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-tgp-tab-btn');
          this.switchTo(target);
        });
      });
    }

    switchTo(target) {
      this.btns.forEach((b) => {
        const isActive = b.getAttribute('data-tgp-tab-btn') === target;
        b.classList.toggle('is-active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      this.panels.forEach((p) => {
        p.classList.toggle('is-active', p.getAttribute('data-tgp-tab-panel') === target);
      });
    }
  }

  /* =========================================================
     TGPQuantity — stepper buttons
  ========================================================= */
  class TGPQuantity {
    constructor(section) {
      this.input = section.querySelector('[data-tgp-qty-input]');
      const minus = section.querySelector('[data-tgp-qty-minus]');
      const plus = section.querySelector('[data-tgp-qty-plus]');

      if (!this.input) return;

      if (minus) minus.addEventListener('click', () => this.step(-1));
      if (plus) plus.addEventListener('click', () => this.step(1));

      this.input.addEventListener('change', () => this.clamp());
    }

    step(delta) {
      const current = parseInt(this.input.value, 10) || 1;
      this.input.value = Math.max(1, current + delta);
    }

    clamp() {
      const val = parseInt(this.input.value, 10);
      if (isNaN(val) || val < 1) this.input.value = 1;
    }
  }

  /* =========================================================
     TGPVariants — swatch/button selection, price & URL update
  ========================================================= */
  class TGPVariants {
    constructor(section, gallery, productData) {
      this.section = section;
      this.gallery = gallery;
      this.product = productData;

      this.priceEl = section.querySelector('[data-tgp-price]');
      this.comparePriceEl = section.querySelector('[data-tgp-compare-price]');
      this.atcBtn = section.querySelector('[data-tgp-atc]');
      this.variantInput = section.querySelector('[data-tgp-variant-id]');
      this.variantBtns = section.querySelectorAll('.tgp-variant-btn');
      this.variantSelects = section.querySelectorAll('[data-tgp-variant-select]');

      if (!this.product || !this.product.variants) return;

      this.variants = this.product.variants;
      this.selectedOptions = this._getInitialOptions();

      this._bindButtons();
      this._bindSelects();
    }

    _getInitialOptions() {
      const selected = this.variants.find((v) => v.available) || this.variants[0];
      return selected ? [...selected.options] : [];
    }

    _bindButtons() {
      this.variantBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const position = parseInt(btn.getAttribute('data-tgp-option'), 10) - 1;
          const value = btn.getAttribute('data-tgp-value');

          this.selectedOptions[position] = value;

          // Update active state within this option group
          const siblings = this.section.querySelectorAll(
            `.tgp-variant-btn[data-tgp-option="${position + 1}"]`
          );
          siblings.forEach((s) => s.classList.toggle('is-selected', s === btn));

          // Update the label showing the selected value
          const label = this.section.querySelector(`[data-tgp-option-selected="${position + 1}"]`);
          if (label) label.textContent = value;

          this._updateVariant();
        });
      });

      // Clear buttons — deselect all buttons in the group, reset label
      this.section.querySelectorAll('[data-tgp-clear]').forEach((clearBtn) => {
        clearBtn.addEventListener('click', () => {
          const position = parseInt(clearBtn.getAttribute('data-tgp-clear'), 10) - 1;
          this.section.querySelectorAll(`.tgp-variant-btn[data-tgp-option="${position + 1}"]`)
            .forEach((b) => b.classList.remove('is-selected'));
          const label = this.section.querySelector(`[data-tgp-option-selected="${position + 1}"]`);
          if (label) label.textContent = '';
        });
      });
    }

    _bindSelects() {
      this.variantSelects.forEach((select) => {
        select.addEventListener('change', () => {
          const position = parseInt(select.getAttribute('data-tgp-option'), 10) - 1;
          this.selectedOptions[position] = select.value;
          this._updateVariant();
        });
      });
    }

    _updateVariant() {
      const match = this.variants.find((v) =>
        v.options.every((opt, i) => opt === this.selectedOptions[i])
      );

      if (!match) return;

      // Update hidden variant input
      if (this.variantInput) this.variantInput.value = match.id;

      // Update price display
      if (this.priceEl) {
        this.priceEl.textContent = this._formatMoney(match.price);
      }

      if (this.comparePriceEl) {
        if (match.compare_at_price && match.compare_at_price > match.price) {
          this.comparePriceEl.textContent = this._formatMoney(match.compare_at_price);
          this.comparePriceEl.style.display = '';
        } else {
          this.comparePriceEl.textContent = '';
          this.comparePriceEl.style.display = 'none';
        }
      }

      // ATC button state
      if (this.atcBtn) {
        if (match.available) {
          this.atcBtn.disabled = false;
          this.atcBtn.textContent = 'Add to Cart';
        } else {
          this.atcBtn.disabled = true;
          this.atcBtn.textContent = 'Sold Out';
        }
      }

      // Update URL without page reload
      const url = new URL(window.location.href);
      url.searchParams.set('variant', match.id);
      history.replaceState({ variantId: match.id }, '', url.toString());

      // Sync gallery to variant image
      if (this.gallery && this.product.images) {
        this.gallery.syncToVariant(match.id, this.product.images);
      }
    }

    _formatMoney(cents) {
      const amount = (cents / 100).toFixed(2);
      return '$' + amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
  }

  /* =========================================================
     TGPFadeIn — IntersectionObserver for scroll animations
  ========================================================= */
  class TGPFadeIn {
    constructor(section) {
      if (!('IntersectionObserver' in window)) {
        section.querySelectorAll('.tgp-fade-in').forEach((el) => el.classList.add('is-visible'));
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      section.querySelectorAll('.tgp-fade-in').forEach((el) => observer.observe(el));
    }
  }

  /* =========================================================
     TGPZoom — circular magnifying glass lens on main image
  ========================================================= */
  class TGPZoom {
    constructor(section) {
      this.wrap = section.querySelector('[data-tgp-gallery-main]');
      this.img  = section.querySelector('[data-tgp-main-img]');
      if (!this.wrap || !this.img) return;

      this.lens = document.createElement('div');
      this.lens.className = 'tgp-zoom-lens';
      this.wrap.appendChild(this.lens);

      this._onMove  = (e) => this._move(e);
      this._onEnter = ()  => { this.lens.style.opacity = '1'; this.wrap.style.cursor = 'none'; };
      this._onLeave = ()  => { this.lens.style.opacity = '0'; this.wrap.style.cursor = ''; };

      this.wrap.addEventListener('mousemove',  this._onMove);
      this.wrap.addEventListener('mouseenter', this._onEnter);
      this.wrap.addEventListener('mouseleave', this._onLeave);
    }

    _move(e) {
      const rect   = this.wrap.getBoundingClientRect();
      const lensW  = this.lens.offsetWidth;
      const lensH  = this.lens.offsetHeight;
      const zoom   = 3;

      // Lens position clamped within image
      let x = e.clientX - rect.left - lensW / 2;
      let y = e.clientY - rect.top  - lensH / 2;
      x = Math.max(0, Math.min(x, rect.width  - lensW));
      y = Math.max(0, Math.min(y, rect.height - lensH));

      this.lens.style.left = x + 'px';
      this.lens.style.top  = y + 'px';

      // Background shows zoomed portion
      this.lens.style.backgroundImage    = `url('${this.img.src}')`;
      this.lens.style.backgroundSize     = `${rect.width * zoom}px ${rect.height * zoom}px`;
      this.lens.style.backgroundPosition = `${-(x * zoom)}px ${-(y * zoom)}px`;
    }

    // Called by gallery when main image changes
    updateSrc(src) {
      if (this.lens.style.opacity === '1') {
        this.lens.style.backgroundImage = `url('${src}')`;
      }
    }
  }

  /* =========================================================
     Init — wait for DOM, then boot each product section
  ========================================================= */
  function initProductPage(sectionEl) {
    const sectionId = sectionEl.getAttribute('data-section-id') || sectionEl.id.replace('tgp-', '');
    const productData = window.tgpProductData && window.tgpProductData[sectionId];

    const gallery = new TGPGallery(sectionEl);
    new TGPZoom(sectionEl);
    new TGPTabs(sectionEl);
    new TGPQuantity(sectionEl);
    new TGPVariants(sectionEl, gallery, productData);
    new TGPFadeIn(sectionEl);
  }

  function boot() {
    document.querySelectorAll('.tgp-product-page').forEach(initProductPage);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Shopify theme editor re-init support
  document.addEventListener('shopify:section:load', (e) => {
    const inner = e.target.querySelector('.tgp-product-page');
    if (inner) initProductPage(inner);
  });
})();
