/* sponsor.niveshsahayak.in: voluntary contributions that keep the free tools free.
   Everything comes from /pay.json (sites/sponsor/static/pay.json), so new UPI or bank details and new names on the
   sponsors list need only that file and a rebuild:
     upi, payee         UPI ID and the name shown in the UPI app; empty = "being added" note
     bank               name, account, ifsc, bank, branch, type; empty account = "being added" note
     sponsors           [{name, town?, url?, since? (YYYY-MM)}], newest first; amounts are never shown
   The QR is a standard upi://pay link (amount only when a chip is picked), drawn by qrcode-generator 1.4.4 from cdnjs. */
(function () {
  'use strict';
  var NS = window.NS, esc = NS.esc;
  var QR = ['https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', 'sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1'];
  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function show(sel, on) { $$(sel).forEach(function (e) { e.hidden = !on; }); }

  function loadQr() {
    if (window.qrcode) return Promise.resolve();
    return new Promise(function (ok, bad) {
      var s = document.createElement('script');
      s.src = QR[0]; s.integrity = QR[1]; s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer';
      s.onload = ok; s.onerror = bad;
      document.head.appendChild(s);
    });
  }

  function copy(text) {
    var done = function () { NS.toast('Copied: ' + text); };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(done);
    var t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); done(); } catch (e) { NS.toast(text); }
    t.remove();
  }

  function upi(p) {
    var box = $('[data-sp-qr]');
    if (!box) return;
    if (!p.upi) { box.hidden = true; show('[data-sp-amts]', false); show('[data-sp-upi-none]', true); return; }
    var amt = '';
    function link() {
      return 'upi://pay?pa=' + encodeURIComponent(p.upi).replace('%40', '@') + '&pn=' + encodeURIComponent(p.payee || 'Nivesh Sahayak') +
        (amt ? '&am=' + amt + '.00' : '') + '&cu=INR&tn=' + encodeURIComponent('Support Nivesh Sahayak');
    }
    function draw() {
      var u = link();
      $('[data-sp-link]').href = u;
      loadQr().then(function () {
        var q = window.qrcode(0, 'M');
        q.addData(u); q.make();
        box.innerHTML = q.createSvgTag({ cellSize: 5, margin: 3, scalable: true }) +
          '<p class="soft sp-small">' + esc(p.payee || '') + (amt ? ' · ₹' + Number(amt).toLocaleString('en-IN') : '') + '</p>';
        box.querySelector('svg').setAttribute('role', 'img');
        box.querySelector('svg').setAttribute('aria-label', 'UPI QR code' + (amt ? ' for ₹' + amt : ''));
      }, function () { box.innerHTML = '<p class="soft">The QR code could not load. Use the UPI ID below.</p>'; });
    }
    $('[data-sp-upi-id]').textContent = p.upi;
    $$('[data-sp-payee]').forEach(function (e) { e.textContent = p.payee || ''; });
    show('[data-sp-upi]', true); show('[data-sp-open]', true);
    $$('[data-amt]').forEach(function (b) {
      b.addEventListener('click', function () {
        amt = b.getAttribute('data-amt');
        $$('[data-amt]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        draw();
      });
    });
    draw();
  }

  function bank(b) {
    var dl = $('[data-sp-bank]');
    if (!dl) return;
    if (!b || !b.account) { show('[data-sp-bank-none]', true); return; }
    var rows = [['Account name', b.name], ['Account number', b.account], ['IFSC', b.ifsc], ['Bank', b.bank], ['Branch', b.branch], ['Account type', b.type]];
    dl.innerHTML = rows.filter(function (r) { return r[1]; }).map(function (r) {
      return '<div><dt>' + esc(r[0]) + '</dt><dd><span>' + esc(r[1]) + '</span>' +
        (/number|IFSC|name/.test(r[0]) ? ' <button type="button" class="btn sm" data-copy-v="' + esc(r[1]) + '">Copy</button>' : '') + '</dd></div>';
    }).join('');
    dl.hidden = false;
    $$('[data-sp-payee]').forEach(function (e) { e.textContent = b.name; });
    show('[data-sp-bank-note]', true);
  }

  function wall(list) {
    var ul = $('[data-sp-wall]');
    if (!ul) return;
    list = (list || []).filter(function (s) { return s && s.name; });
    if (!list.length) { ul.hidden = true; show('[data-sp-wall-none]', true); return; }
    ul.innerHTML = list.map(function (s) {
      var name = s.url && /^https:\/\//.test(s.url) ? '<a href="' + esc(s.url) + '" rel="sponsored noopener" target="_blank">' + esc(s.name) + '</a>' : esc(s.name);
      var when = s.since ? new Date(s.since + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '';
      return '<li><b>' + name + '</b>' + (s.town || when ? '<small>' + esc([s.town, when ? 'since ' + when : ''].filter(Boolean).join(' · ')) + '</small>' : '') + '</li>';
    }).join('');
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy],[data-copy-v]');
    if (!b) return;
    copy(b.hasAttribute('data-copy-v') ? b.getAttribute('data-copy-v') : $('[data-sp-upi-id]').textContent);
  });

  fetch('/pay.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (p) {
    upi(p); bank(p.bank); wall(p.sponsors);
  }, function () {
    upi({}); bank(null); wall([]);
  });
})();
