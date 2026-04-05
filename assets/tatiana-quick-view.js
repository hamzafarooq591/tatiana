/**
 * Tatiana theme — product quick view (collection + homepage).
 * @param {{ idRoot: string, triggerRoot?: Document|Element }} config
 */
(function (global) {
  'use strict';

  function formatMoney(cents) {
    if (typeof Shopify !== 'undefined' && typeof Shopify.formatMoney === 'function') {
      return Shopify.formatMoney(cents);
    }
    return '$' + (cents / 100).toFixed(2);
  }

  function init(config) {
    var idRoot = config.idRoot || 'tgc-qv';
    var triggerRoot = config.triggerRoot || document;

    function gid(suffix) {
      return idRoot + '-' + suffix;
    }

    var qvOverlay = document.getElementById(gid('overlay'));
    if (!qvOverlay) return;

    var qvImg = document.getElementById(gid('img'));
    var qvDots = document.getElementById(gid('dots'));
    var qvTitle = document.getElementById(gid('title'));
    var qvPrice = document.getElementById(gid('price'));
    var qvDesc = document.getElementById(gid('desc'));
    var qvOptions = document.getElementById(gid('options'));
    var qvQtyVal = document.getElementById(gid('qty-val'));
    var qvAtc = document.getElementById(gid('atc'));
    var qvMsg = document.getElementById(gid('atc-msg'));

    var qvImages = [];
    var qvImgIdx = 0;
    var qvVariants = [];
    var qvSelVariant = null;
    var qvQty = 1;

    function qvSetImg(idx) {
      if (!qvImages.length) return;
      qvImgIdx = (idx + qvImages.length) % qvImages.length;
      qvImg.src = qvImages[qvImgIdx];
      qvDots.querySelectorAll('.tgc-qv-dot').forEach(function (d, i) {
        d.classList.toggle('is-active', i === qvImgIdx);
      });
    }

    document.getElementById(gid('prev')).addEventListener('click', function () {
      qvSetImg(qvImgIdx - 1);
    });
    document.getElementById(gid('next')).addEventListener('click', function () {
      qvSetImg(qvImgIdx + 1);
    });

    function qvUpdateVariant() {
      var selected = [];
      qvOptions.querySelectorAll('.tgc-qv-option-btns').forEach(function (grp) {
        var a = grp.querySelector('.tgc-qv-opt-btn.is-active');
        if (a) selected.push(a.dataset.val);
      });
      qvVariants.forEach(function (v) {
        if (v.options.every(function (o, i) {
          return o === selected[i];
        })) qvSelVariant = v;
      });
      if (qvSelVariant) {
        qvPrice.textContent = formatMoney(qvSelVariant.price);
        qvAtc.disabled = !qvSelVariant.available;
        qvAtc.textContent = qvSelVariant.available ? 'Add To Cart' : 'Sold Out';
      }
    }

    function qvOpen(handle) {
      qvOverlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      qvTitle.textContent = 'Loading…';
      qvPrice.textContent = '';
      qvDesc.innerHTML = '';
      qvOptions.innerHTML = '';
      qvMsg.textContent = '';
      qvQty = 1;
      qvQtyVal.textContent = '1';
      qvAtc.disabled = false;
      qvAtc.textContent = 'Add To Cart';

      fetch('/products/' + handle + '.js')
        .then(function (r) {
          return r.json();
        })
        .then(function (p) {
          qvImages = p.images.length ? p.images : [''];
          qvDots.innerHTML = '';
          qvImages.forEach(function (_, i) {
            var d = document.createElement('button');
            d.type = 'button';
            d.className = 'tgc-qv-dot';
            d.addEventListener('click', function () {
              qvSetImg(i);
            });
            qvDots.appendChild(d);
          });
          qvSetImg(0);

          qvTitle.textContent = p.title;
          qvVariants = p.variants;
          qvSelVariant = p.variants[0];
          qvPrice.textContent = formatMoney(qvSelVariant.price);
          qvDesc.innerHTML = p.description;

          var isDefault = p.options.length === 1 && p.options[0].name === 'Title';
          if (!isDefault) {
            p.options.forEach(function (opt) {
              var grp = document.createElement('div');
              grp.className = 'tgc-qv-option-group';
              var lbl = document.createElement('p');
              lbl.className = 'tgc-qv-option-label';
              lbl.textContent = opt.name;
              grp.appendChild(lbl);
              var btns = document.createElement('div');
              btns.className = 'tgc-qv-option-btns';
              opt.values.forEach(function (val, vi) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'tgc-qv-opt-btn' + (vi === 0 ? ' is-active' : '');
                b.textContent = val;
                b.dataset.val = val;
                b.addEventListener('click', function () {
                  btns.querySelectorAll('.tgc-qv-opt-btn').forEach(function (x) {
                    x.classList.remove('is-active');
                  });
                  b.classList.add('is-active');
                  qvUpdateVariant();
                });
                btns.appendChild(b);
              });
              grp.appendChild(btns);
              qvOptions.appendChild(grp);
            });
          }
          qvUpdateVariant();
        })
        .catch(function () {
          qvTitle.textContent = 'Could not load product.';
        });
    }

    function qvClose() {
      qvOverlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    document.getElementById(gid('close')).addEventListener('click', qvClose);
    qvOverlay.addEventListener('click', function (e) {
      if (e.target === qvOverlay) qvClose();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && qvOverlay.classList.contains('is-open')) qvClose();
    });

    document.getElementById(gid('qty-minus')).addEventListener('click', function () {
      if (qvQty > 1) {
        qvQty--;
        qvQtyVal.textContent = String(qvQty);
      }
    });
    document.getElementById(gid('qty-plus')).addEventListener('click', function () {
      qvQty++;
      qvQtyVal.textContent = String(qvQty);
    });

    qvAtc.addEventListener('click', function () {
      if (!qvSelVariant || !qvSelVariant.available) return;
      qvAtc.textContent = 'Adding…';
      qvAtc.disabled = true;
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: qvSelVariant.id, quantity: qvQty })
      })
        .then(function (r) {
          return r.json();
        })
        .then(function () {
          qvMsg.textContent = 'Added to cart!';
          qvAtc.textContent = 'Add To Cart';
          qvAtc.disabled = false;
          setTimeout(function () {
            qvMsg.textContent = '';
          }, 3000);
        })
        .catch(function () {
          qvMsg.textContent = 'Something went wrong.';
          qvAtc.textContent = 'Add To Cart';
          qvAtc.disabled = false;
        });
    });

    triggerRoot.querySelectorAll('[data-tgc-qv]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var h = btn.getAttribute('data-tgc-qv');
        if (h) qvOpen(h);
      });
    });
  }

  global.TatianaQuickView = { init: init };
})(typeof window !== 'undefined' ? window : this);
