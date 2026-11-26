(() => {
  const cfg = window.INVITATION_CONFIG;
  if (!cfg) return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const getByPath = (obj, path) =>
    path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);

  const escapeHtml = (str) =>
    String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const formatStackedName = (fullName) => {
    const parts = String(fullName || "").trim().split(/\s+/);
    if (parts.length <= 1) return escapeHtml(fullName);
    const first = parts[0];
    const rest = parts.slice(1).join(" ");
    return `${escapeHtml(first)} <span>${escapeHtml(rest)}</span>`;
  };

  /* ---- 1. Apply theme CSS variables ---- */
  const applyTheme = () => {
    const t = cfg.theme || {};
    const root = document.documentElement;
    ["ivory", "plum", "lavender", "mauve", "lilac", "champagne"].forEach((k) => {
      if (t[k]) root.style.setProperty(`--${k}`, t[k]);
    });
  };

  /* ---- 2. Bind metadata & text slots ---- */
  const applyBindings = () => {
    if (cfg.site?.title) document.title = cfg.site.title;
    const descMeta = $('meta[name="description"]');
    if (descMeta && cfg.site?.description) {
      descMeta.setAttribute("content", cfg.site.description);
    }

    $$("[data-bind]").forEach((el) => {
      const val = getByPath(cfg, el.dataset.bind);
      if (val !== undefined && val !== null) {
        el.textContent = String(val);
      }
    });

    const groomEl = $("#groomName");
    const brideEl = $("#brideName");
    if (groomEl) groomEl.innerHTML = formatStackedName(cfg.couple?.groom?.name);
    if (brideEl) brideEl.innerHTML = formatStackedName(cfg.couple?.bride?.name);

    const groomFirst = String(cfg.couple?.groom?.name || "").trim().split(/\s+/)[0];
    const brideFirst = String(cfg.couple?.bride?.name || "").trim().split(/\s+/)[0];

    const sigEl = $("#welcomeSignature");
    if (sigEl) {
      sigEl.innerHTML = `${escapeHtml(groomFirst)} <span>&amp;</span> ${escapeHtml(brideFirst)}`;
    }

    const closingNamesEl = $("#closingNames");
    if (closingNamesEl) {
      closingNamesEl.innerHTML = `${escapeHtml(groomFirst)} <span>&amp;</span> ${escapeHtml(brideFirst)}`;
    }

    const closingDetailsEl = $("#closingDetails");
    if (closingDetailsEl) {
      closingDetailsEl.textContent = `${cfg.wedding?.date || ""} • ${cfg.venue?.name || ""}`;
    }

    const mapLink = $("#mapLink");
    if (mapLink && cfg.venue?.mapUrl) {
      mapLink.href = cfg.venue.mapUrl;
    }

    const coordContacts = $("#coordinationContacts");
    if (coordContacts && Array.isArray(cfg.coordination?.contacts)) {
      coordContacts.innerHTML = cfg.coordination.contacts
        .map(
          (c) =>
            `<a class="coord-phone-link" href="tel:+91${escapeHtml(c.phone)}"><strong>${escapeHtml(c.name)}</strong><span>— ${escapeHtml(c.phone)}</span></a>`
        )
        .join("");
    }
  };

  /* ---- 3. Media setup & Hero opening ---- */
  const setupMediaAndHero = () => {
    const hero = $("#hero");
    const video = $("#introVideo");
    const videoSrc = $("#introVideoSource");
    const audio = $("#backgroundMusic");

    if (video && cfg.media?.introPoster) {
      video.poster = cfg.media.introPoster;
    }
    if (video && videoSrc && cfg.media?.introVideo) {
      videoSrc.src = cfg.media.introVideo;
      video.load();
    }
    if (audio && cfg.media?.music) {
      audio.src = cfg.media.music;
    }

    if (!hero) return;

    const openInvitation = () => {
      if (hero.classList.contains("is-open")) return;
      hero.classList.remove("is-closed");
      hero.classList.add("is-open");
      hero.removeAttribute("role");
      hero.removeAttribute("tabindex");
      document.body.classList.remove("intro-locked");

      if (video) {
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
      if (audio && audio.src) {
        const ap = audio.play();
        if (ap && typeof ap.catch === "function") ap.catch(() => {});
      }
    };

    hero.addEventListener("click", (e) => {
      if (hero.classList.contains("is-closed")) {
        e.preventDefault();
        openInvitation();
      }
    });

    hero.addEventListener("keydown", (e) => {
      if (hero.classList.contains("is-closed") && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        openInvitation();
      }
    });
  };

  /* ---- 4. Calendar helpers ---- */
  const CAL_ICON_SVG =
    '<span class="cal-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg></span>';

  const toIcsStamp = (iso) => {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      "T" +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      "Z"
    );
  };

  const escapeIcs = (str) =>
    String(str || "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");

  const buildIcs = (events) => {
    const now = toIcsStamp(new Date().toISOString());
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Wedding Invitation//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];
    events.forEach((ev, idx) => {
      lines.push(
        "BEGIN:VEVENT",
        `UID:event-${idx}-${Date.now()}@wedding`,
        `DTSTAMP:${now}`,
        `DTSTART:${toIcsStamp(ev.start)}`,
        `DTEND:${toIcsStamp(ev.end)}`,
        `SUMMARY:${escapeIcs(ev.title)}`,
        `LOCATION:${escapeIcs(ev.location)}`,
        `DESCRIPTION:${escapeIcs(ev.description)}`,
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        "DESCRIPTION:Reminder",
        "END:VALARM",
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  };

  const downloadIcs = (filename, events) => {
    const blob = new Blob([buildIcs(events)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  let activeMenu = null;
  const closeCalMenu = () => {
    if (activeMenu) {
      activeMenu.remove();
      activeMenu = null;
    }
  };

  document.addEventListener("click", (e) => {
    if (activeMenu && !activeMenu.contains(e.target) && !e.target.closest("[data-cal-trigger]")) {
      closeCalMenu();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCalMenu();
  });

  const openCalMenu = (anchor, ev) => {
    closeCalMenu();
    const dates = `${toIcsStamp(ev.start)}/${toIcsStamp(ev.end)}`;
    const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      ev.title
    )}&dates=${dates}&location=${encodeURIComponent(ev.location)}&details=${encodeURIComponent(
      ev.description
    )}`;
    const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(
      ev.title
    )}&startdt=${encodeURIComponent(ev.start)}&enddt=${encodeURIComponent(
      ev.end
    )}&location=${encodeURIComponent(ev.location)}&body=${encodeURIComponent(ev.description)}`;

    const menu = document.createElement("div");
    menu.className = "cal-menu";
    menu.setAttribute("role", "menu");
    menu.innerHTML = `
      <div class="cal-menu-title">${escapeHtml(ev.title)}</div>
      <a role="menuitem" href="${gcal}" target="_blank" rel="noopener noreferrer">Google Calendar</a>
      <a role="menuitem" href="${outlook}" target="_blank" rel="noopener noreferrer">Outlook.com</a>
      <button role="menuitem" type="button">Apple / Other (.ics)</button>
    `;
    menu.querySelector("button").addEventListener("click", () => {
      downloadIcs("wedding-event.ics", [ev]);
      closeCalMenu();
    });

    document.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 236;
    const left = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rect.left + window.scrollX));
    const top = rect.bottom + window.scrollY + 8;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    activeMenu = menu;
  };

  const mainWeddingEvent = () => {
    const startIso = cfg.wedding?.isoDate || "2026-12-20T18:00:00+05:30";
    const endIso = new Date(new Date(startIso).getTime() + 4 * 3600 * 1000).toISOString();
    return {
      title: cfg.wedding?.calendarEvent || "Aadesh & Nikita Wedding",
      start: startIso,
      end: endIso,
      location: `${cfg.venue?.name || ""}, ${cfg.venue?.address || ""}`,
      description: `Wedding Celebration of ${cfg.couple?.groom?.name || ""} & ${cfg.couple?.bride?.name || ""}.`
    };
  };

  const setupCalendarIcons = () => {
    $$("[data-cal-icon]").forEach((btn) => {
      if (!btn.querySelector(".cal-ico")) {
        btn.insertAdjacentHTML("afterbegin", CAL_ICON_SVG);
      }
    });

    const saveDateBtn = $("#saveDateBtn");
    if (saveDateBtn) {
      saveDateBtn.setAttribute("data-cal-trigger", "true");
      saveDateBtn.addEventListener("click", () => openCalMenu(saveDateBtn, mainWeddingEvent()));
    }

    const addAllBtn = $("#addAllCal");
    if (addAllBtn) {
      addAllBtn.addEventListener("click", () => {
        const events = (cfg.preWeddingEvents || []).map((ev) => ({
          title: `${ev.name} — Aadesh & Nikita`,
          start: ev.start,
          end: ev.end,
          location: ev.location || cfg.venue?.name || "",
          description: `${ev.name} (${ev.time}) at ${ev.location || cfg.venue?.name || ""}`
        }));
        if (events.length) downloadIcs("wedding-festivities.ics", events);
      });
    }
  };

  /* ---- 5. Scratch-to-Reveal & Petal Shower ---- */
  const launchPetals = () => {
    const colors = cfg.theme?.petalColors || [
      "linear-gradient(135deg, #C9414F, #8C1620)",
      "linear-gradient(135deg, #E3C08A, #C9A35F)"
    ];
    const shower = document.createElement("div");
    shower.className = "petal-shower";
    shower.setAttribute("aria-hidden", "true");
    document.body.appendChild(shower);

    const petals = [];
    const count = 34;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("i");
      const size = 9 + Math.random() * 10;
      el.style.width = `${size}px`;
      el.style.height = `${size * 0.72}px`;
      el.style.borderRadius = "65% 35% 60% 40% / 55% 45% 55% 45%";
      el.style.background = colors[i % colors.length];
      shower.appendChild(el);
      petals.push({
        el,
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 180,
        vy: 1.5 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 1.1,
        swayAmp: 0.6 + Math.random() * 1.4,
        rot: Math.random() * 360,
        vrot: (Math.random() - 0.5) * 4,
        phase: Math.random() * Math.PI * 2
      });
    }

    let frame = 0;
    const tick = () => {
      frame++;
      let alive = false;
      const h = window.innerHeight + 40;
      petals.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx + Math.sin(frame * 0.04 + p.phase) * p.swayAmp;
        p.rot += p.vrot;
        const opacity = p.y > h - 120 ? Math.max(0, (h - p.y) / 120) : 0.9;
        if (p.y < h) alive = true;
        p.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) rotate(${p.rot.toFixed(1)}deg)`;
        p.el.style.opacity = String(opacity);
      });
      if (alive && frame < 280) {
        requestAnimationFrame(tick);
      } else {
        shower.remove();
      }
    };
    requestAnimationFrame(tick);
  };

  const setupScratchCard = () => {
    const card = $("#scratchCard");
    const canvas = $("#scratchCanvas");
    const heading = $("#scratchHeading");
    const note = $("#scratchNote");
    const saveDateBtn = $("#saveDateBtn");
    const dateReveal = $(".date-reveal");
    if (!card || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let isDrawing = false;
    let revealed = false;
    let lastPos = null;
    let strokeCount = 0;

    const drawFoil = () => {
      if (revealed) return;
      const w = canvas.clientWidth || 760;
      const h = canvas.clientHeight || 475;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const foilColors = cfg.theme?.scratchFoil || [
        "#5C0F16",
        "#8C1620",
        "#C9A35F",
        "#8C1620",
        "#4A0B10"
      ];
      const grad = ctx.createLinearGradient(0, 0, w, h);
      foilColors.forEach((c, idx) => grad.addColorStop(idx / Math.max(1, foilColors.length - 1), c));
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle shimmer flecks
      ctx.fillStyle = "rgba(255, 245, 220, 0.14)";
      for (let i = 0; i < 160; i++) {
        const fx = (Math.sin(i * 78.233) * 0.5 + 0.5) * w;
        const fy = (Math.cos(i * 45.164) * 0.5 + 0.5) * h;
        ctx.fillRect(fx, fy, 1.5, 1.5);
      }

      ctx.fillStyle = "#F7E7C6";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const fontSize = Math.max(11, Math.min(15, w * 0.02));
      ctx.font = `600 ${fontSize}px "DM Sans", sans-serif`;
      ctx.fillText("✦  SCRATCH HERE  ✦", w / 2, h * 0.52);
    };

    const completeReveal = () => {
      if (revealed) return;
      revealed = true;
      isDrawing = false;
      canvas.style.opacity = "0";
      canvas.style.pointerEvents = "none";
      card.classList.add("is-revealed");
      if (heading) heading.textContent = "Save the Date";
      if (note) note.hidden = true;
      if (saveDateBtn) saveDateBtn.hidden = false;
      if (dateReveal) {
        dateReveal.classList.add("is-actionable");
        dateReveal.setAttribute("tabindex", "0");
        dateReveal.addEventListener("click", () => openCalMenu(dateReveal, mainWeddingEvent()));
      }
      launchPetals();
    };

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches && e.touches[0] ? e.touches[0] : e;
      return {
        x: pt.clientX - rect.left,
        y: pt.clientY - rect.top
      };
    };

    const scratchAt = (pos) => {
      if (revealed) return;
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(32, canvas.clientWidth * 0.075);
      ctx.beginPath();
      if (lastPos) {
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(pos.x, pos.y);
      } else {
        ctx.arc(pos.x, pos.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      }
      ctx.stroke();
      lastPos = pos;

      strokeCount++;
      if (strokeCount % 6 === 0) {
        const w = canvas.width;
        const h = canvas.height;
        // Sample center window region where the date sits
        const sx = Math.floor(w * 0.22);
        const sy = Math.floor(h * 0.3);
        const sw = Math.max(1, Math.floor(w * 0.56));
        const sh = Math.max(1, Math.floor(h * 0.4));
        const data = ctx.getImageData(sx, sy, sw, sh).data;
        let cleared = 0;
        let total = 0;
        for (let i = 3; i < data.length; i += 16) {
          total++;
          if (data[i] < 40) cleared++;
        }
        if (total > 0 && cleared / total > 0.34) {
          completeReveal();
        }
      }
    };

    drawFoil();
    window.addEventListener("resize", () => {
      if (!revealed) drawFoil();
    });

    canvas.addEventListener("pointerdown", (e) => {
      isDrawing = true;
      lastPos = null;
      canvas.setPointerCapture?.(e.pointerId);
      scratchAt(getPos(e));
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!isDrawing) return;
      scratchAt(getPos(e));
    });
    const endDraw = () => {
      isDrawing = false;
      lastPos = null;
    };
    canvas.addEventListener("pointerup", endDraw);
    canvas.addEventListener("pointercancel", endDraw);

    canvas.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        completeReveal();
      }
    });
  };

  /* ---- 6. Gallery ---- */
  const setupGallery = () => {
    const frame = $("#galleryFrame");
    const slidesEl = $("#gallerySlides");
    const dotsEl = $("#galleryDots");
    const items = cfg.media?.gallery || [];
    if (!frame || !slidesEl || !items.length) return;

    let current = 0;
    slidesEl.innerHTML = items
      .map(
        (item, idx) => `
        <figure class="gallery-slide${idx === 0 ? " is-active" : ""}">
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt || "Couple photo")}" loading="${
            idx === 0 ? "eager" : "lazy"
          }" />
          ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ""}
        </figure>
      `
      )
      .join("");

    if (dotsEl) {
      dotsEl.innerHTML = items
        .map(
          (_, idx) =>
            `<button type="button" class="${idx === 0 ? "is-active" : ""}" aria-label="Show photo ${
              idx + 1
            }"></button>`
        )
        .join("");
    }

    const slides = $$(".gallery-slide", slidesEl);
    const dots = dotsEl ? $$("button", dotsEl) : [];

    const show = (index) => {
      current = (index + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle("is-active", i === current));
      dots.forEach((d, i) => d.classList.toggle("is-active", i === current));
    };

    dots.forEach((dot, idx) => dot.addEventListener("click", () => show(idx)));
    if (slides.length > 1) {
      frame.addEventListener("click", () => show(current + 1));

      let touchStartX = null;
      frame.addEventListener(
        "touchstart",
        (e) => {
          touchStartX = e.touches[0]?.clientX ?? null;
        },
        { passive: true }
      );
      frame.addEventListener(
        "touchend",
        (e) => {
          if (touchStartX === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
          touchStartX = null;
          if (Math.abs(dx) > 36) show(current + (dx < 0 ? 1 : -1));
        },
        { passive: true }
      );

      setInterval(() => show(current + 1), 5500);
    }
  };

  /* ---- 7. Countdown ---- */
  const setupCountdown = () => {
    const dEl = $("#countdownDays");
    const hEl = $("#countdownHours");
    const mEl = $("#countdownMinutes");
    const sEl = $("#countdownSeconds");
    if (!dEl || !hEl || !mEl || !sEl) return;

    const target = new Date(cfg.wedding?.isoDate || "2026-12-20T18:00:00+05:30").getTime();
    const pad = (n) => String(n).padStart(2, "0");

    const update = () => {
      const diff = Math.max(0, target - Date.now());
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      dEl.textContent = pad(days);
      hEl.textContent = pad(hours);
      mEl.textContent = pad(mins);
      sEl.textContent = pad(secs);
    };

    update();
    setInterval(update, 1000);
  };

  /* ---- 8. Program Timeline ---- */
  const setupProgram = () => {
    const container = $("#programTimeline");
    if (!container || !Array.isArray(cfg.program)) return;

    container.innerHTML = cfg.program
      .map(
        (item) => `
        <article>
          <time>${escapeHtml(item.time)}</time>
          <div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.note)}</p>
          </div>
        </article>
      `
      )
      .join("");
  };

  /* ---- 9. Festivities Event Cards ---- */
  const EVENT_ICONS = {
    rings:
      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="19" cy="29" r="10"/><circle cx="29" cy="29" r="10"/><path d="M29 15.5l-3-3.5 3-3 3 3z"/></svg>',
    ceremony:
      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 42V24c0-9 7-16 16-16s16 7 16 16v18"/><path d="M14 42V26c0-5.5 4.5-10 10-10s10 4.5 10 10v16"/><path d="M24 4v4"/><circle cx="24" cy="24" r="2.2"/></svg>',
    dinner:
      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="26" r="13"/><circle cx="24" cy="26" r="8"/><path d="M24 9v4M18 11l1.5 3M30 11l-1.5 3"/></svg>',
    reception:
      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M24 7l3.2 7.8L35 18l-7.8 3.2L24 29l-3.2-7.8L13 18l7.8-3.2z"/><circle cx="12" cy="34" r="2"/><circle cx="36" cy="34" r="2"/><path d="M18 39h12"/></svg>'
  };

  const setupEvents = () => {
    const list = $("#preWeddingEvents");
    if (!list || !Array.isArray(cfg.preWeddingEvents)) return;

    list.innerHTML = "";
    cfg.preWeddingEvents.forEach((ev) => {
      const article = document.createElement("article");
      const t = ev.theme || {};
      if (t.bg) article.style.background = t.bg;
      if (t.text) article.style.color = t.text;
      if (t.border) article.style.setProperty("--event-border", t.border);
      if (t.meta) article.style.setProperty("--event-meta", t.meta);
      if (t.accent) article.style.setProperty("--event-accent", t.accent);
      if (t.onAccent) article.style.setProperty("--event-on-accent", t.onAccent);
      if (t.button) article.style.setProperty("--event-btn", t.button);

      const iconSvg = EVENT_ICONS[ev.icon] || EVENT_ICONS.rings;
      article.innerHTML = `
        <span class="event-icon" aria-hidden="true">${iconSvg}</span>
        <h3>${escapeHtml(ev.name)}</h3>
        <button type="button" class="event-date" data-cal-trigger="true">
          ${CAL_ICON_SVG}
          <span>${escapeHtml(ev.date)}</span>
        </button>
        <p>${escapeHtml(ev.time)}</p>
        <small>${escapeHtml(ev.location)}</small>
        <div class="event-actions">
          <button type="button" class="event-btn" data-cal-trigger="true">Add to Calendar</button>
          <a class="event-btn" href="${escapeHtml(ev.mapLink || cfg.venue?.mapUrl || "#")}" target="_blank" rel="noreferrer">View Map</a>
        </div>
      `;

      const calPayload = {
        title: `${ev.name} — Aadesh & Nikita`,
        start: ev.start,
        end: ev.end,
        location: ev.location || cfg.venue?.name || "",
        description: `${ev.name} (${ev.time}) at ${ev.location || cfg.venue?.name || ""}`
      };

      $$('[data-cal-trigger="true"]', article).forEach((trigger) => {
        trigger.addEventListener("click", () => openCalMenu(trigger, calPayload));
      });

      list.appendChild(article);
    });
  };

  /* ---- 10. Reveal animations ---- */
  const setupReveal = () => {
    const els = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "-40px 0px", threshold: 0.05 }
    );
    els.forEach((el) => io.observe(el));
  };

  /* ---- Init ---- */
  applyTheme();
  applyBindings();
  setupMediaAndHero();
  setupProgram();
  setupEvents();
  setupCalendarIcons();
  setupScratchCard();
  setupGallery();
  setupCountdown();
  setupReveal();
})();
