(() => {
  'use strict';

  const GLOBAL_KEY = '__ymTrackCollector';
  const VERSION = '1.1.0';

  if (window[GLOBAL_KEY]?.cleanup) {
    window[GLOBAL_KEY].cleanup();
  }

  const CFG = {
    debounceMs: 120,
    settleMs: 8000,
    settleStableMs: 900,
    settleTickMs: 200,
    maxParentLevels: 8
  };

  const SELECTORS = {
    trackLink: 'a[href*="/track/"]',
    artistLink: 'a[href*="/artist/"]',
    row: [
      '[data-testid*="track"]',
      '[data-testid*="Track"]',
      '[class*="track"]',
      '[class*="Track"]',
      '[class*="playlist__item"]',
      '[role="row"]',
      'li'
    ].join(','),
    title: [
      '[data-testid*="title"]',
      '[data-testid*="Title"]',
      '[class*="title"]',
      '[class*="Title"]'
    ].join(','),
    artist: [
      '[data-testid*="artist"]',
      '[data-testid*="Artist"]',
      '[class*="artist"]',
      '[class*="Artist"]'
    ].join(','),
    duration: [
      'time',
      '[data-testid*="duration"]',
      '[data-testid*="Duration"]',
      '[class*="duration"]',
      '[class*="Duration"]'
    ].join(',')
  };

  const tracks = new Map();

  const state = {
    running: true,
    observer: null,
    listeners: [],
    timers: new Set()
  };

  window[GLOBAL_KEY] = state;

  // =========================
  // STYLES
  // =========================

  const injectStyles = () => {
    if (document.getElementById('ym-scraper-styles')) {
      return;
    }

    const style = document.createElement('style');

    style.id = 'ym-scraper-styles';

    style.textContent = `
      #ym-scraper {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 999999;
        width: 290px;
        background: #0e0e0e;
        border: 1px solid #222;
        border-radius: 12px;
        padding: 18px;
        font-family:
          ui-monospace,
          SFMono-Regular,
          Menlo,
          Monaco,
          Consolas,
          "Courier New",
          monospace;
        font-size: 12px;
        color: #999;
        box-shadow: 0 8px 40px rgba(0, 0, 0, .6);
      }

      #ym-scraper .h {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
      }

      #ym-scraper .l {
        font-size: 10px;
        letter-spacing: .12em;
        text-transform: uppercase;
        color: #444;
      }

      #ym-scraper .v {
        color: #333;
        font-size: 10px;
      }

      #ym-scraper .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #3b3b3b;
        flex: 0 0 auto;
      }

      #ym-scraper .dot.a {
        background: #c8f560;
        box-shadow: 0 0 8px rgba(200, 245, 96, .5);
      }

      #ym-scraper .c {
        font-size: 34px;
        color: #f0f0f0;
        line-height: 1;
        margin: 6px 0;
      }

      #ym-scraper .s {
        font-size: 11px;
        color: #555;
        min-height: 14px;
        margin: 10px 0 12px;
      }

      #ym-scraper button {
        width: 100%;
        padding: 9px 12px;
        border: 1px solid #2a2a2a;
        border-radius: 8px;
        background: transparent;
        color: #ccc;
        font: inherit;
        font-size: 11px;
        letter-spacing: .06em;
        cursor: pointer;
        text-align: left;
        margin-top: 8px;
      }

      #ym-scraper button:hover {
        background: #1a1a1a;
        border-color: #444;
        color: #fff;
      }

      #ym-scraper button.p {
        border-color: #c8f560;
        color: #c8f560;
      }

      #ym-scraper button.p:hover {
        background: rgba(200, 245, 96, .07);
      }

      #ym-scraper .f {
        margin-top: 12px;
        font-size: 10px;
        color: #2e2e2e;
      }

      #ym-scraper .f span {
        color: #c8f560;
      }
    `;

    document.head.appendChild(style);
  };

  // =========================
  // HELPERS
  // =========================

  const safeText = (element) => {
    if (!element) {
      return '';
    }

    return (element.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const unique = (array) => {
    return Array.from(new Set(array.filter(Boolean)));
  };

  const escapeHtml = (value) => {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const csvCell = (value) => {
    return `"${String(value || '').replace(/"/g, '""')}"`;
  };

  const isDurationText = (value) => {
    return /^\d{1,2}:\d{2}$/.test(value);
  };

  const getTrackId = (href) => {
    if (!href) {
      return '';
    }

    const match = String(href).match(/\/track\/(\d+)/);

    return match ? match[1] : '';
  };

  const closestTrackContainer = (trackElement) => {
    let container = trackElement.parentElement;
    let firstRowCandidate = null;

    for (
      let level = 0;
      level < CFG.maxParentLevels && container;
      level += 1
    ) {
      if (!firstRowCandidate && container.matches?.(SELECTORS.row)) {
        firstRowCandidate = container;
      }

      if (
        container.querySelector(SELECTORS.artistLink) ||
        container.querySelector(SELECTORS.duration)
      ) {
        return container;
      }

      container = container.parentElement;
    }

    return firstRowCandidate || trackElement.parentElement || trackElement;
  };

  const extractTitle = (trackElement, container) => {
    const candidates = unique([
      trackElement.getAttribute('title'),
      trackElement.getAttribute('aria-label'),
      safeText(trackElement),
      ...Array.from(container.querySelectorAll(SELECTORS.title)).map(safeText)
    ]);

    return candidates.find((value) => {
      return value && !isDurationText(value);
    }) || '';
  };

  const extractArtists = (container, title) => {
    const fromLinks = Array.from(
      container.querySelectorAll(SELECTORS.artistLink)
    ).map(safeText);

    const fromLabels = Array.from(
      container.querySelectorAll(SELECTORS.artist)
    ).map(safeText);

    return unique([...fromLinks, ...fromLabels])
      .filter((value) => value !== title)
      .join(', ');
  };

  const extractDuration = (container) => {
    const fromElement = Array.from(
      container.querySelectorAll(SELECTORS.duration)
    )
      .map(safeText)
      .find(isDurationText);

    if (fromElement) {
      return fromElement;
    }

    const match = safeText(container).match(/\b\d{1,2}:\d{2}\b/);

    return match ? match[0] : '';
  };

  const mergeTrack = (nextTrack) => {
    const currentTrack = tracks.get(nextTrack.id);

    if (!currentTrack) {
      tracks.set(nextTrack.id, nextTrack);
      return true;
    }

    const mergedTrack = {
      ...currentTrack,
      title: currentTrack.title || nextTrack.title,
      artists: currentTrack.artists || nextTrack.artists,
      duration: currentTrack.duration || nextTrack.duration
    };

    const changed =
      mergedTrack.title !== currentTrack.title ||
      mergedTrack.artists !== currentTrack.artists ||
      mergedTrack.duration !== currentTrack.duration;

    if (changed) {
      tracks.set(nextTrack.id, mergedTrack);
    }

    return changed;
  };

  const setManagedTimeout = (fn, ms) => {
    const timer = setTimeout(() => {
      state.timers.delete(timer);
      fn();
    }, ms);

    state.timers.add(timer);

    return timer;
  };

  const debounce = (fn, ms) => {
    let timer;

    return (...args) => {
      clearTimeout(timer);
      state.timers.delete(timer);

      timer = setManagedTimeout(() => {
        fn(...args);
      }, ms);
    };
  };

  const addListener = (target, eventName, handler, options) => {
    if (!target?.addEventListener) {
      return;
    }

    target.addEventListener(eventName, handler, options);
    state.listeners.push({
      target,
      eventName,
      handler,
      options
    });
  };

  const stopWatchers = () => {
    state.listeners.forEach((listener) => {
      listener.target.removeEventListener(
        listener.eventName,
        listener.handler,
        listener.options
      );
    });

    state.listeners = [];

    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    state.timers.forEach((timer) => {
      clearTimeout(timer);
    });

    state.timers.clear();
  };

  state.cleanup = () => {
    stopWatchers();

    document.getElementById('ym-scraper')?.remove();
  };

  // =========================
  // EXTRACT TRACKS
  // =========================

  const extractTracks = () => {
    let changed = false;

    document.querySelectorAll(SELECTORS.trackLink).forEach((trackElement) => {
      const id = getTrackId(trackElement.href);

      if (!id) {
        return;
      }

      const container = closestTrackContainer(trackElement);
      const title = extractTitle(trackElement, container);

      if (!title) {
        return;
      }

      changed = mergeTrack({
        id,
        title,
        artists: extractArtists(container, title),
        duration: extractDuration(container)
      }) || changed;
    });

    return changed;
  };

  // =========================
  // FORMAT
  // =========================

  const formatTracks = () => {
    const array = Array.from(tracks.values());

    const txt = array
      .map((track) => {
        if (track.artists) {
          return `${track.artists} - ${track.title}`;
        }

        return track.title;
      })
      .join('\n');

    const csvRows = array.map((track) => {
      return [
        track.artists,
        track.title,
        track.duration
      ].map(csvCell).join(',');
    });

    const csv = [
      'Artist,Title,Duration',
      ...csvRows
    ].join('\n');

    return {
      txt,
      csv
    };
  };

  // =========================
  // DOWNLOAD
  // =========================

  const downloadFile = (content, filename, type) => {
    const blob = new Blob(
      [content],
      {
        type: `${type};charset=utf-8`
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setManagedTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  // =========================
  // PANEL
  // =========================

  const getPanel = () => {
    let panel = document.getElementById('ym-scraper');

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'ym-scraper';
      document.body.appendChild(panel);
    }

    return panel;
  };

  const renderPanel = (stateText = '') => {
    const panel = getPanel();
    const safeStateText = escapeHtml(stateText || (
      state.running
        ? 'Scroll manually - collecting tracks'
        : 'Ready to download'
    ));

    panel.innerHTML = `
      <div class="h">
        <div>
          <div class="l">Track Collector</div>
          <div class="v">v${VERSION}</div>
        </div>

        <div class="dot ${state.running ? 'a' : ''}"></div>
      </div>

      <div class="c">${tracks.size}</div>

      <div class="s">${safeStateText}</div>

      ${
        state.running
          ? `
            <button id="ym-settle" class="p">Finalize capture</button>
            <button id="ym-stop">Stop</button>
          `
          : `
            <button id="ym-dl-txt" class="p">Download .txt</button>
            <button id="ym-dl-csv">Download .csv</button>
          `
      }

      <div class="f">tool by <span>idaniil24</span></div>
    `;

    if (state.running) {
      document.getElementById('ym-stop')?.addEventListener('click', () => {
        state.running = false;
        stopWatchers();
        renderPanel('Stopped');
      });

      document.getElementById('ym-settle')?.addEventListener(
        'click',
        settleCapture
      );

      return;
    }

    document.getElementById('ym-dl-txt')?.addEventListener('click', () => {
      downloadFile(formatTracks().txt, 'tracks.txt', 'text/plain');
    });

    document.getElementById('ym-dl-csv')?.addEventListener('click', () => {
      downloadFile(formatTracks().csv, 'tracks.csv', 'text/csv');
    });
  };

  // =========================
  // FINALIZE
  // =========================

  const sleep = (ms) => {
    return new Promise((resolve) => {
      setManagedTimeout(resolve, ms);
    });
  };

  async function settleCapture() {
    renderPanel('Finalizing capture...');

    const startedAt = Date.now();
    let stableSince = Date.now();

    while (Date.now() - startedAt < CFG.settleMs) {
      const changed = extractTracks();

      if (changed) {
        stableSince = Date.now();
      }

      renderPanel('Finalizing capture...');

      if (Date.now() - stableSince >= CFG.settleStableMs) {
        break;
      }

      await sleep(CFG.settleTickMs);
    }

    state.running = false;
    stopWatchers();
    renderPanel('Ready to download');
  }

  // =========================
  // WATCH
  // =========================

  const collectAndRender = (message = 'Collecting tracks...') => {
    if (!state.running) {
      return;
    }

    extractTracks();
    renderPanel(message);
  };

  const scheduleCollect = debounce(() => {
    collectAndRender('Collecting tracks...');
  }, CFG.debounceMs);

  const watchDomChanges = () => {
    if (!document.body || !window.MutationObserver) {
      return;
    }

    state.observer = new MutationObserver((mutations) => {
      const panel = document.getElementById('ym-scraper');
      const hasPageChanges = mutations.some((mutation) => {
        if (!panel) {
          return true;
        }

        const changedNodes = [
          mutation.target,
          ...mutation.addedNodes,
          ...mutation.removedNodes
        ];

        return changedNodes.some((node) => {
          if (node === panel || panel.contains(node)) {
            return false;
          }

          return !node.closest?.('#ym-scraper');
        });
      });

      if (hasPageChanges) {
        scheduleCollect();
      }
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  const watchScroll = () => {
    const scroller = document.querySelector(
      '[data-virtuoso-scroller="true"]'
    );

    unique([
      scroller,
      document.scrollingElement,
      document.documentElement,
      window
    ]).forEach((target) => {
      addListener(target, 'scroll', scheduleCollect, {
        passive: true
      });
    });
  };

  // =========================
  // START
  // =========================

  injectStyles();
  renderPanel('Collecting tracks...');
  extractTracks();
  watchDomChanges();
  watchScroll();
  renderPanel('Scroll manually - collecting tracks');

  console.log(
    `[YM Track Collector] Started v${VERSION}. Found ${tracks.size} tracks.`
  );
})();
