(() => {
  'use strict';

  const tracks = new Map();
  let running = true;

  const CFG = {
    debounceMs: 120,
    settleMs: 8000,
    settleTickMs: 200
  };

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

        box-shadow:
          0 8px 40px rgba(0, 0, 0, .6);
      }

      #ym-scraper .h {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      #ym-scraper .l {
        font-size: 10px;
        letter-spacing: .12em;
        text-transform: uppercase;
        color: #444;
      }

      #ym-scraper .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #3b3b3b;
      }

      #ym-scraper .dot.a {
        background: #c8f560;
        box-shadow:
          0 0 8px rgba(200, 245, 96, .5);
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

  // =========================
  // HELPERS
  // =========================

  const safeText = (element) => {
    if (!element) {
      return '';
    }

    return (element.textContent || '').trim();
  };

  // =========================
  // EXTRACT TRACKS
  // =========================

  const extractTracks = () => {
    const trackLinks = document.querySelectorAll(
      'a[href*="/track/"]'
    );

    trackLinks.forEach((trackElement) => {
      const href = trackElement.href;

      if (!href) {
        return;
      }

      const match = href.match(/\/track\/(\d+)/);

      if (!match) {
        return;
      }

      const id = match[1];

      if (tracks.has(id)) {
        return;
      }

      const title = safeText(trackElement);

      if (!title) {
        return;
      }

      /*
       * Ищем ближайший контейнер,
       * внутри которого находится ссылка артиста.
       *
       * В твоём DOM:
       *
       * track
       * artist
       *
       * находятся рядом.
       */

      let container = trackElement.parentElement;
      let artistElement = null;

      for (let level = 0; level < 6 && container; level++) {
        artistElement = container.querySelector(
          'a[href*="/artist/"]'
        );

        if (artistElement) {
          break;
        }

        container = container.parentElement;
      }

      const artists = safeText(artistElement);

      tracks.set(id, {
        id,
        title,
        artists
      });
    });
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
      const artist = track.artists
        .replace(/"/g, '""');

      const title = track.title
        .replace(/"/g, '""');

      return `"${artist}","${title}"`;
    });

    const csv =
      'Artist,Title\n' +
      csvRows.join('\n');

    return {
      txt,
      csv
    };
  };

  // =========================
  // DOWNLOAD
  // =========================

  const downloadFile = (
    content,
    filename,
    type
  ) => {
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

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  // =========================
  // PANEL RENDER
  // =========================

  const renderPanel = (state = '') => {
    const panel = getPanel();

    panel.innerHTML = `
      <div class="h">
        <div class="l">
          Track Collector
        </div>

        <div class="dot ${running ? 'a' : ''}"></div>
      </div>

      <div class="c">
        ${tracks.size}
      </div>

      <div class="s">
        ${
          state ||
          (
            running
              ? 'Scroll manually — collecting tracks'
              : 'Finished'
          )
        }
      </div>

      ${
        running
          ? `
            <button
              id="ym-settle"
              class="p"
            >
              Finalize capture
            </button>

            <button
              id="ym-stop"
            >
              Stop
            </button>
          `
          : `
            <button
              id="ym-dl-txt"
              class="p"
            >
              Download .txt
            </button>

            <button
              id="ym-dl-csv"
            >
              Download .csv
            </button>
          `
      }

      <div class="f">
        tool by <span>idaniil24</span>
      </div>
    `;

    // =====================
    // RUNNING
    // =====================

    if (running) {
      const stopButton =
        document.getElementById('ym-stop');

      const settleButton =
        document.getElementById('ym-settle');

      if (stopButton) {
        stopButton.onclick = () => {
          running = false;

          renderPanel('Stopped');
        };
      }

      if (settleButton) {
        settleButton.onclick = settleCapture;
      }

      return;
    }

    // =====================
    // FINISHED
    // =====================

    const txtButton =
      document.getElementById('ym-dl-txt');

    const csvButton =
      document.getElementById('ym-dl-csv');

    if (txtButton) {
      txtButton.onclick = () => {
        downloadFile(
          formatTracks().txt,
          'tracks.txt',
          'text/plain'
        );
      };
    }

    if (csvButton) {
      csvButton.onclick = () => {
        downloadFile(
          formatTracks().csv,
          'tracks.csv',
          'text/csv'
        );
      };
    }
  };

  // =========================
  // SLEEP
  // =========================

  const sleep = (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };

  // =========================
  // FINALIZE
  // =========================

  const settleCapture = async () => {
    renderPanel(
      'Finalizing capture...'
    );

    const start = Date.now();

    let lastSize = tracks.size;

    while (
      Date.now() - start <
      CFG.settleMs
    ) {
      extractTracks();

      if (tracks.size === lastSize) {
        break;
      }

      lastSize = tracks.size;

      renderPanel(
        'Finalizing capture...'
      );

      await sleep(
        CFG.settleTickMs
      );
    }

    running = false;

    renderPanel(
      'Ready to download'
    );
  };

  // =========================
  // DEBOUNCE
  // =========================

  const debounce = (fn, ms) => {
    let timer;

    return (...args) => {
      clearTimeout(timer);

      timer = setTimeout(() => {
        fn(...args);
      }, ms);
    };
  };

  // =========================
  // SCROLL
  // =========================

  const onScroll = debounce(() => {
    if (!running) {
      return;
    }

    extractTracks();

    renderPanel(
      'Collecting tracks...'
    );
  }, CFG.debounceMs);

  // =========================
  // FIND SCROLLER
  // =========================

  const scroller =
    document.querySelector(
      '[data-virtuoso-scroller="true"]'
    ) ||
    document.scrollingElement ||
    document.documentElement;

  // =========================
  // START
  // =========================

  injectStyles();

  renderPanel(
    'Collecting tracks...'
  );

  // Собрать то, что уже видно
  extractTracks();

  renderPanel(
    'Scroll manually — collecting tracks'
  );

  // Следить за прокруткой
  scroller.addEventListener(
    'scroll',
    onScroll,
    {
      passive: true
    }
  );

  console.log(
    `[YM Scraper] Started. Found ${tracks.size} tracks.`
  );
})();
