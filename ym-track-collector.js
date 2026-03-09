(() => {
  const tracks = new Map();
  let running = true;

  const CFG = {
    debounceMs: 120,
    settleMs: 8000,
    settleTickMs: 200,
  };

  const injectStyles = () => {
    if (document.getElementById("ym-scraper-styles")) return;

    const style = document.createElement("style");
    style.id = "ym-scraper-styles";
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
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace;
        font-size: 12px;
        color: #999;
        box-shadow: 0 8px 40px rgba(0,0,0,.6);
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
        box-shadow: 0 0 8px rgba(200,245,96,.5);
      }

      #ym-scraper .c {
        font-size: 34px;
        color: #f0f0f0;
        line-height: 1;
        margin: 6px 0;
      }

      #ym-scraper .s {
        font-size: 11px;
        color: #444;
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
        background: rgba(200,245,96,.07);
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

  const getPanel = () => {
    let panel = document.getElementById("ym-scraper");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "ym-scraper";
      document.body.appendChild(panel);
    }
    return panel;
  };

  const safeText = (el) => (el && el.textContent ? el.textContent.trim() : "");

  const extractTracks = () => {
    const elements = document.querySelectorAll(
      '[data-intersection-property-id^="tracks_track_"]',
    );
    let newTracksCount = 0;

    elements.forEach((el) => {
      const rawId = el.getAttribute("data-intersection-property-id");
      const id = rawId.replace("tracks_track_", "");

      if (!id || tracks.has(id)) return;

      const titleEl =
        el.querySelector(".Meta_title__GGBnH") ||
        el.querySelector('[class="Meta_title"]') ||
        el.querySelector('a[href*="track"]');

      const title = safeText(titleEl);
      if (!title) return;

      const artistEls = el.querySelectorAll(
        '.Meta_artistCaption__JESZi, [class="Meta_artistCaption"]',
      );
      const artists = Array.from(artistEls)
        .map(safeText)
        .filter(Boolean)
        .join(", ");

      tracks.set(id, {
        id,
        title,
        artists,
      });

      newTracksCount++;

      // Обновляем счётчик в реальном времени при добавлении новых треков
      if (running && newTracksCount % 5 === 0) {
        renderPanel(`Loading... (${tracks.size})`);
      }
    });

    // Всегда обновляем счётчик
    if (running) {
      renderPanel(`Loading... (${tracks.size})`);
    }
  };

  const formatTracks = () => {
    const arr = Array.from(tracks.values());

    const txt = arr.map((t) => `${t.artists} - ${t.title}`).join("\n");

    const csv =
      "Artist,Title\n" +
      arr
        .map(
          (t) =>
            `"${t.artists.replace(/"/g, '""')}","${t.title.replace(/"/g, '""')}"`,
        )
        .join("\n");

    return { txt, csv };
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  };

  const renderPanel = (state = "") => {
    const panel = getPanel();

    panel.innerHTML = `
      <div class="h">
        <div class="l">Track Collector</div>
        <div class="dot ${running ? "a" : ""}"></div>
      </div>

      <div class="c">${tracks.size}</div>

      <div class="s">
        ${state || (running ? "Scroll manually — collecting tracks" : "Finished")}
      </div>

      ${
        running
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

    if (running) {
      document.getElementById("ym-stop").onclick = () => {
        running = false;
        renderPanel("Stopped");
      };

      document.getElementById("ym-settle").onclick = settleCapture;
    } else {
      document.getElementById("ym-dl-txt").onclick = () => {
        downloadFile(formatTracks().txt, "tracks.txt", "text/plain");
      };

      document.getElementById("ym-dl-csv").onclick = () => {
        downloadFile(formatTracks().csv, "tracks.csv", "text/csv");
      };
    }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const settleCapture = async () => {
    renderPanel("Finalizing capture...");

    const start = Date.now();
    let last = tracks.size;

    while (Date.now() - start < CFG.settleMs) {
      extractTracks();

      if (tracks.size === last) break;

      last = tracks.size;

      renderPanel("Finalizing capture...");

      await sleep(CFG.settleTickMs);
    }

    running = false;
    renderPanel("Ready to download");
  };

  const scroller =
    document.querySelector('[data-virtuoso-scroller="true"]') ||
    document.scrollingElement ||
    document.documentElement;

  const debounce = (fn, ms) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  const onScroll = debounce(() => {
    if (!running) return;

    extractTracks();
    renderPanel(`Collecting tracks... (${tracks.size})`);
  }, CFG.debounceMs);

  const autoScroll = async () => {
    if (!running) return;

    extractTracks();
    renderPanel(`Auto-scrolling... (${tracks.size})`);
    setTimeout(autoScroll, 100);
  };

  injectStyles();
  renderPanel();

  extractTracks();

  scroller.addEventListener("scroll", onScroll, { passive: true });

  // Автоматически скроллим при открытии
  setTimeout(autoScroll, 100);
})();
