(() = {

  const tracks = new Map()
  let running = true

  const CFG = {
    debounceMs 120,
    settleMs 8000,
    settleTickMs 200
  }

  const injectStyles = () = {
    if (document.getElementById(ym-scraper-styles)) return

    const style = document.createElement(style)
    style.id = ym-scraper-styles
    style.textContent = `
      #ym-scraper{
        positionfixed;
        top24px;
        right24px;
        z-index999999;
        width290px;
        background#0e0e0e;
        border1px solid #222;
        border-radius12px;
        padding18px;
        font-familyui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Courier New,monospace;
        font-size12px;
        color#999;
        box-shadow0 8px 40px rgba(0,0,0,.6)
      }

      #ym-scraper .h{
        displayflex;
        justify-contentspace-between;
        align-itemscenter;
        margin-bottom10px
      }

      #ym-scraper .l{
        font-size10px;
        letter-spacing.12em;
        text-transformuppercase;
        color#444
      }

      #ym-scraper .dot{
        width7px;
        height7px;
        border-radius50%;
        background#3b3b3b
      }

      #ym-scraper .dot.a{
        background#c8f560;
        box-shadow0 0 8px rgba(200,245,96,.5)
      }

      #ym-scraper .c{
        font-size34px;
        color#f0f0f0;
        line-height1;
        margin6px 0
      }

      #ym-scraper .s{
        font-size11px;
        color#444;
        min-height14px;
        margin10px 0 12px
      }

      #ym-scraper button{
        width100%;
        padding9px 12px;
        border1px solid #2a2a2a;
        border-radius8px;
        backgroundtransparent;
        color#ccc;
        fontinherit;
        font-size11px;
        letter-spacing.06em;
        cursorpointer;
        text-alignleft;
        margin-top8px
      }

      #ym-scraper buttonhover{
        background#1a1a1a;
        border-color#444;
        color#fff
      }

      #ym-scraper button.p{
        border-color#c8f560;
        color#c8f560
      }

      #ym-scraper button.phover{
        backgroundrgba(200,245,96,.07)
      }

      #ym-scraper .f{
        margin-top12px;
        font-size10px;
        color#2e2e2e
      }

      #ym-scraper .f span{
        color#c8f560
      }
    `
    document.head.appendChild(style)
  }

  const getPanel = () = {
    let panel = document.getElementById(ym-scraper)
    if (!panel) {
      panel = document.createElement(div)
      panel.id = ym-scraper
      document.body.appendChild(panel)
    }
    return panel
  }

  const safeText = el = el && el.textContent  el.textContent.trim()  

  const extractTracks = () = {

    const elements = document.querySelectorAll('[data-intersection-property-id^=tracks_track_]')

    elements.forEach(el = {

      const rawId = el.getAttribute(data-intersection-property-id)  
      const id = rawId.replace(tracks_track_,)

      if(!id  tracks.has(id)) return

      const titleEl =
        el.querySelector(.Meta_title__GGBnH) 
        el.querySelector('[class=Meta_title]') 
        el.querySelector('a[href=track]')

      const title = safeText(titleEl)
      if(!title) return

      const artistEls = el.querySelectorAll(.Meta_artistCaption__JESZi, [class='Meta_artistCaption'])
      const artists = Array.from(artistEls).map(safeText).filter(Boolean).join(, )

      tracks.set(id,{
        id,
        title,
        artists
      })

    })

  }

  const formatTracks = () = {

    const arr = Array.from(tracks.values())

    const txt = arr.map(t = `${t.artists} - ${t.title}`).join(n)

    const csv =
      Artist,Titlen +
      arr.map(t = `${t.artists.replace(g,'')},${t.title.replace(g,'')}`).join(n)

    return {txt,csv}
  }

  const downloadFile = (content,filename,type) = {

    const blob = new Blob([content],{type})
    const url = URL.createObjectURL(blob)

    const a = document.createElement(a)
    a.href = url
    a.download = filename
    a.click()

    URL.revokeObjectURL(url)
  }

  const renderPanel = (state=) = {

    const panel = getPanel()

    panel.innerHTML = `
      div class=h
        div class=lTrack Collectordiv
        div class=dot ${running  a}div
      div

      div class=c${tracks.size}div

      div class=s
        ${state  (running  Scroll manually — collecting tracks  Finished)}
      div

      ${
        running
         `
        button id=ym-settle class=pFinalize capturebutton
        button id=ym-stopStopbutton
        `
        
        `
        button id=ym-dl-txt class=pDownload .txtbutton
        button id=ym-dl-csvDownload .csvbutton
        `
      }

      div class=ftool by spanidaniil24spandiv
    `

    if(running){

      document.getElementById(ym-stop).onclick = ()={
        running=false
        renderPanel(Stopped)
      }

      document.getElementById(ym-settle).onclick = settleCapture

    }else{

      document.getElementById(ym-dl-txt).onclick = ()={
        downloadFile(formatTracks().txt,tracks.txt,textplain)
      }

      document.getElementById(ym-dl-csv).onclick = ()={
        downloadFile(formatTracks().csv,tracks.csv,textcsv)
      }

    }

  }

  const sleep = ms = new Promise(r=setTimeout(r,ms))

  const settleCapture = async ()={

    renderPanel(Finalizing capture...)

    const start = Date.now()
    let last = tracks.size

    while(Date.now()-start  CFG.settleMs){

      extractTracks()

      if(tracks.size === last) break

      last = tracks.size

      renderPanel(Finalizing capture...)

      await sleep(CFG.settleTickMs)

    }

    running=false
    renderPanel(Ready to download)

  }

  const scroller =
    document.querySelector('[data-virtuoso-scroller=true]') 
    document.scrollingElement 
    document.documentElement

  const debounce = (fn,ms)={
    let t
    return (...args)={
      clearTimeout(t)
      t=setTimeout(()=fn(...args),ms)
    }
  }

  const onScroll = debounce(()={

    if(!running) return

    extractTracks()
    renderPanel(Collecting tracks...)

  },CFG.debounceMs)

  injectStyles()
  renderPanel()

  extractTracks()

  scroller.addEventListener(scroll,onScroll,{passivetrue})

})()