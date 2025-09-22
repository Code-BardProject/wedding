// Interactive invitation logic
// - Countdown
// - Confetti
// - RSVP modal + validation
// - Web Share API
// - Add to Calendar (ICS)

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);

  // Countdown
  function startCountdown() {
    const el = $('#countdown');
    if (!el) return;
    const targetStr = el.dataset.date; // ISO with timezone
    const target = targetStr ? new Date(targetStr) : null;
    if (!target || isNaN(target.getTime())) return;

    const dEl = $('#d', el);
    const hEl = $('#h', el);
    const mEl = $('#m', el);
    const sEl = $('#s', el);

    function tick() {
      const now = new Date();
      let diff = Math.max(0, target.getTime() - now.getTime());

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      diff -= days * 24 * 60 * 60 * 1000;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      diff -= hours * 60 * 60 * 1000;
      const minutes = Math.floor(diff / (1000 * 60));
      diff -= minutes * 60 * 1000;
      const seconds = Math.floor(diff / 1000);

      dEl.textContent = String(days);
      hEl.textContent = String(hours).padStart(2, '0');
      mEl.textContent = String(minutes).padStart(2, '0');
      sEl.textContent = String(seconds).padStart(2, '0');
    }

    tick();
    setInterval(tick, 1000);
  }

  // Confetti
  function confetti() {
    const canvas = /** @type {HTMLCanvasElement} */ ($('#confetti-canvas'));
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const colors = ['#ff8da1', '#ffc0cb', '#ffd6e7', '#ffccd5', '#ffe0e6', '#e7c6a8'];
    const pieces = [];
    const COUNT = Math.min(200, Math.floor((W * H) / 12000));

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function createPiece() {
      return {
        x: rand(0, W),
        y: rand(-H, 0),
        size: rand(10, 18),
        vy: rand(0.8, 2.2),
        vx: rand(-0.4, 0.4),
        r: rand(0, Math.PI * 2),
        vr: rand(-0.05, 0.05),
        color: colors[Math.floor(rand(0, colors.length))],
        opacity: rand(0.7, 1),
      };
    }

    for (let i = 0; i < COUNT; i++) pieces.push(createPiece());

    // Draw a heart centered at (0,0) with given size
    function drawHeartPath(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.25);
      ctx.bezierCurveTo(
        s * 0.5, -s * 0.9,
        s * 1.3, -s * 0.1,
        0, s * 0.7
      );
      ctx.bezierCurveTo(
        -s * 1.3, -s * 0.1,
        -s * 0.5, -s * 0.9,
        0, -s * 0.25
      );
      ctx.closePath();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (let p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;

        if (p.y - 20 > H) {
          // reset to top
          p.x = rand(0, W);
          p.y = rand(-H * 0.2, 0);
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        drawHeartPath(ctx, p.size);
        ctx.fill();
        ctx.restore();
      }
      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    });

    // run and keep animating
    draw();
  }

  // RSVP modal
  function setupModal() {
    const modal = /** @type {HTMLDialogElement} */ ($('#rsvpModal'));
    const openBtn = $('#rsvpBtn');
    const closeBtn = $('#closeModal');
    const form = $('#rsvpForm');
    if (!modal || !openBtn || !closeBtn || !form) return;

    openBtn.addEventListener('click', () => {
      if (typeof modal.showModal === 'function') {
        modal.showModal();
      } else {
        modal.setAttribute('open', '');
      }
    });

    closeBtn.addEventListener('click', () => {
      if (typeof modal.close === 'function') modal.close();
      else modal.removeAttribute('open');
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const guests = Number(data.get('guests'));
      const status = String(data.get('status') || '');
      const message = String(data.get('message') || '').trim();

      let valid = true;
      const nameErr = $('[data-for="name"]', form);
      const guestsErr = $('[data-for="guests"]', form);
      if (name.length < 2) { valid = false; nameErr.textContent = 'Введите имя'; } else { nameErr.textContent = ''; }
      if (!(guests >= 1 && guests <= 10)) { valid = false; guestsErr.textContent = '1–10 гостей'; } else { guestsErr.textContent = ''; }
      if (!valid) return;

      // Here you can send to backend / google sheet etc.
      console.log('RSVP:', { name, guests, status, message });

      const modalEl = /** @type {HTMLDialogElement} */ (modal);
      if (typeof modalEl.close === 'function') modalEl.close();

      // Success toast
      const toast = document.createElement('div');
      toast.textContent = 'Спасибо! Мы получили ваш ответ.';
      toast.style.position = 'fixed';
      toast.style.left = '50%';
      toast.style.bottom = '28px';
      toast.style.transform = 'translateX(-50%)';
      toast.style.background = 'rgba(20,22,29,.95)';
      toast.style.color = '#e9eef5';
      toast.style.border = '1px solid rgba(255,255,255,.16)';
      toast.style.padding = '.7rem 1rem';
      toast.style.borderRadius = '12px';
      toast.style.boxShadow = '0 10px 30px rgba(0,0,0,.35)';
      toast.style.zIndex = '9999';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2800);

      form.reset();
    });
  }

  // Web Share
  function setupShare() {
    const btn = $('#shareBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const title = document.title || 'Приглашение';
      const text = 'Приглашаем вас на наш особенный день!';
      const url = location.href;
      if (navigator.share) {
        try { await navigator.share({ title, text, url }); } catch {}
      } else {
        try {
          await navigator.clipboard.writeText(url);
          btn.textContent = 'Ссылка скопирована';
          setTimeout(() => (btn.textContent = 'Поделиться приглашением'), 1800);
        } catch {
          alert('Скопируйте ссылку: ' + url);
        }
      }
    });
  }

  // Add to Calendar: create and download ICS file
  function setupCalendar() {
    const btn = $('#addToCalendar');
    const countdown = $('#countdown');
    if (!btn || !countdown) return;

    btn.addEventListener('click', () => {
      const startDate = new Date(countdown.dataset.date);
      if (!startDate || isNaN(startDate.getTime())) return alert('Дата события не настроена');

      // Default duration 4 hours
      const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000);

      const title = 'Свадьба Анны и Никиты';
      const locationStr = 'Гранд Холл, Москва';
      const description = 'Будем рады видеть вас!';

      function toICSDate(d) {
        // Convert to UTC and format YYYYMMDDTHHMMSSZ
        const pad = (n) => String(n).padStart(2, '0');
        return (
          d.getUTCFullYear() +
          pad(d.getUTCMonth() + 1) +
          pad(d.getUTCDate()) + 'T' +
          pad(d.getUTCHours()) +
          pad(d.getUTCMinutes()) +
          pad(d.getUTCSeconds()) + 'Z'
        );
      }

      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Interactive Invitation//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        'UID:' + Math.random().toString(36).slice(2) + '@invitation',
        'DTSTAMP:' + toICSDate(new Date()),
        'DTSTART:' + toICSDate(startDate),
        'DTEND:' + toICSDate(endDate),
        'SUMMARY:' + title,
        'DESCRIPTION:' + description,
        'LOCATION:' + locationStr,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'invitation-event.ics';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      a.remove();
    });
  }

  // Init
  window.addEventListener('DOMContentLoaded', () => {
    startCountdown();
    confetti();
    setupModal();
    setupShare();
    setupCalendar();
  });
})();
