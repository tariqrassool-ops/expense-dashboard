// ===================== LEDGER MARKETING/STORY PAGE ANIMATIONS =====================
// Ported from the standalone Ledger landing-page design. Runs as a plain script (not a module) — GSAP is a global.

(function(){
  "use strict";

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);

  var today = new Date();
  var dateStr = today.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase();
  var heroDateEl = document.getElementById('heroDate');
  var signDateEl = document.getElementById('signDate');
  if (heroDateEl) heroDateEl.textContent = dateStr.slice(0,6);
  if (signDateEl) signDateEl.textContent = dateStr;

  function setStaticCounts(){
    document.querySelectorAll('[data-count]').forEach(function(el){
      el.textContent = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || '');
    });
    document.querySelectorAll('[data-insight-count]').forEach(function(el){
      var target = parseInt(el.dataset.insightCount, 10) || 0;
      el.textContent = 'Rs ' + target.toLocaleString('en-LK');
    });
    var c5Unified = document.getElementById('c5Unified');
    var c5Cols = document.getElementById('c5Cols');
    if (c5Unified && c5Cols){ c5Unified.style.opacity = 0; c5Cols.style.opacity = 1; }
    var c1TotalAmt = document.getElementById('c1TotalAmt');
    if (c1TotalAmt){ c1TotalAmt.textContent = 'Rs 38.00'; }
    document.querySelectorAll('.sec-row').forEach(function(row){
      row.classList.add(row.dataset.kind === 'receipt' ? 'sec-hit' : 'sec-dim');
    });
    var c3Badge = document.getElementById('c3Badge');
    if (c3Badge) c3Badge.style.opacity = 1;
  }

  /* Hero "recently entered" list — the same add/remove behavior the real
     expense list shows: a new entry slides in, the oldest ages out, and the
     running total recalculates from what's actually on screen. Pure CSS/GSAP,
     no backend — this is illustrative, same as the rest of the story page. */
  var HERO_DEMO_POOL = [
    { merchant:'Uber Eats',        cat:'cat-food',        label:'FOOD',      amount:15.60 },
    { merchant:'CEB Electricity',  cat:'cat-utilities',   label:'UTILITIES', amount:24.10 },
    { merchant:'Cargills Food City', cat:'cat-groceries', label:'GROCERIES', amount:21.35 },
    { merchant:'Dialog Postpaid',  cat:'cat-utilities',   label:'UTILITIES', amount:19.90 },
    { merchant:'Split with Nadia', cat:'cat-banking',     label:'SHARED',    amount:14.75 },
    { merchant:'PickMe Rides',     cat:'cat-travel',      label:'TRAVEL',    amount:9.20 }
  ];

  function heroRowMarkup(entry){
    var row = document.createElement('div');
    row.className = 'activity-item';
    row.setAttribute('data-sync-row', '');
    row.innerHTML =
      '<div class="activity-left">' +
        '<div class="activity-merchant">' + entry.merchant + '</div>' +
        '<span class="category-badge ' + entry.cat + '">' + entry.label + '</span>' +
      '</div>' +
      '<div class="activity-amount num">Rs ' + entry.amount.toFixed(2) + '</div>';
    return row;
  }

  function updateHeroTotal(listEl){
    var total = 0;
    listEl.querySelectorAll('.activity-amount').forEach(function(el){
      total += parseFloat(el.textContent.replace('Rs', '').trim()) || 0;
    });
    var totalEl = document.getElementById('heroTotal');
    if (totalEl) totalEl.textContent = 'Rs ' + total.toFixed(2);
  }

  function startHeroLiveDemo(){
    var list = document.getElementById('heroActivityList');
    if (!list) return;
    var poolIndex = 0;

    var cycle = gsap.timeline({ repeat:-1, repeatDelay:2.2 });
    cycle.call(function(){
      var rows = list.querySelectorAll('.activity-item');
      var oldest = rows[rows.length - 1];
      var entry = HERO_DEMO_POOL[poolIndex % HERO_DEMO_POOL.length];
      poolIndex++;

      var newRow = heroRowMarkup(entry);
      list.insertBefore(newRow, list.firstChild);
      var targetH = newRow.offsetHeight;
      newRow.style.overflow = 'hidden';
      gsap.set(newRow, { height:0, autoAlpha:0, paddingTop:0, paddingBottom:0, marginBottom:0 });
      gsap.to(newRow, {
        height:targetH, autoAlpha:1, paddingTop:11, paddingBottom:11, duration:0.5, ease:'power2.out',
        onComplete:function(){ newRow.style.height = ''; newRow.style.overflow = ''; updateHeroTotal(list); }
      });

      if (oldest){
        oldest.style.overflow = 'hidden';
        gsap.to(oldest, {
          height:0, autoAlpha:0, paddingTop:0, paddingBottom:0, duration:0.45, ease:'power2.in', delay:0.15,
          onComplete:function(){ oldest.remove(); updateHeroTotal(list); }
        });
      }
    });
  }

  if (!hasGsap || reduceMotion){
    setStaticCounts();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var mm = gsap.matchMedia();

  mm.add('(min-width: 701px)', function(){

    gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top' } })
      .from('[data-anim="hero-h"]', { y:18, duration:0.7, ease:'power3.out' })
      .from('[data-anim="hero-p"]', { y:12, duration:0.55, ease:'power3.out' }, '-=0.35')
      .from('[data-anim="hero-cta"]', { y:10, duration:0.5, ease:'power3.out' }, '-=0.3')
      .from('#leafFront', { autoAlpha:0, y:26, rotate:0, duration:0.8, ease:'power3.out' }, '-=0.6')
      .from('#leafBack', { autoAlpha:0, y:40, duration:0.8, ease:'power3.out' }, '-=0.65');

    gsap.to('#leafFront', {
      y: '+=50', ease:'none',
      scrollTrigger: { trigger:'#hero', start:'top top', end:'bottom top', scrub:true }
    });
    gsap.to('#leafBack', {
      y: '+=90', ease:'none',
      scrollTrigger: { trigger:'#hero', start:'top top', end:'bottom top', scrub:true }
    });

    startHeroLiveDemo();

    gsap.timeline({ scrollTrigger: { trigger:'#totals', start:'top 78%' } })
      .from('.totals-cell', { autoAlpha:0, y:18, duration:0.6, stagger:0.08, ease:'power2.out' });

    document.querySelectorAll('[data-count]').forEach(function(el){
      var target = parseFloat(el.dataset.count);
      var prefix = el.dataset.prefix || '';
      var suffix = el.dataset.suffix || '';
      var obj = { val:0 };
      gsap.to(obj, {
        val:target, duration:1.2, ease:'power2.out',
        scrollTrigger: { trigger:el, start:'top 88%' },
        onUpdate: function(){ el.textContent = prefix + Math.round(obj.val) + suffix; }
      });
    });

    /* ---- CHAPTERS — pinned sequential build (the Prolibu mechanic) ---- */
    function mapProg(p, start, end){
      if (end === start) return p >= end ? 1 : 0;
      return Math.min(1, Math.max(0, (p - start) / (end - start)));
    }
    function triPulse(p, center, width){
      return Math.min(1, Math.max(0, 1 - Math.abs(p - center) / width));
    }

    /* Each pinned chapter now gets a full viewport of scroll distance.
       This tiny continuous drift gives even small scroll inputs a visible response
       without overpowering the main product choreography. */
    function scrubStage(stage, p){
      if (!stage) return;
      var wave = Math.sin(p * Math.PI);
      gsap.set(stage, {
        y: 4 - 8 * p,
        scale: 1 + 0.012 * wave
      });
    }

    gsap.utils.toArray('.chapter').forEach(function(sec){
      var text = sec.querySelectorAll('.chapter-text > *');
      var stage = sec.querySelector('.chapter-stage');
      var num = sec.querySelector('.chapter-num');
      var fromX = sec.classList.contains('reverse') ? 70 : -70;
      gsap.timeline({ scrollTrigger: { trigger:sec, start:'top 82%' } })
        .from(num, { autoAlpha:0, y:36, scale:0.7, duration:0.5, ease:'back.out(2)' })
        .from(text, { autoAlpha:0, y:30, duration:0.6, stagger:0.08, ease:'power3.out' }, '-=0.25')
        .from(stage, { autoAlpha:0, x:fromX, scale:0.92, duration:0.75, ease:'power3.out' }, '-=0.7');
    });

    /* Chapters 1–6: each mockup plays its reveal sequence once, when the chapter
       scrolls into view, and then stays fully visible. (Previously these used a
       pin+scrub pattern tied to precise scroll position — reliable in theory, but
       any pinning hiccup, zoom level, or scroll speed variance could leave a chapter
       stuck showing its "before" state — an empty box — instead of its "after" state.
       A one-shot reveal has no such window: once triggered, it always finishes.) */

    /* Chapter 01 — Calculate: line items print one by one -> total ticks up */
    (function(){
      var l1 = document.getElementById('c1L1');
      var l2 = document.getElementById('c1L2');
      var l3 = document.getElementById('c1L3');
      var totalAmt = document.getElementById('c1TotalAmt');
      if (!l1) return;
      gsap.set([l1,l2,l3], { autoAlpha:0, x:-20 });
      var counter = { val:0 };

      gsap.timeline({ scrollTrigger:{ trigger:'#chapter-1', start:'top 65%' } })
        .to(l1, { autoAlpha:1, x:0, duration:0.4, ease:'power2.out' })
        .to(l2, { autoAlpha:1, x:0, duration:0.4, ease:'power2.out' }, '+=0.1')
        .to(l3, { autoAlpha:1, x:0, duration:0.4, ease:'power2.out' }, '+=0.1')
        .to(counter, {
          val:38.00, duration:0.6, ease:'power2.out',
          onUpdate:function(){ totalAmt.textContent = 'Rs ' + counter.val.toFixed(2); }
        }, '+=0.15')
        .to(totalAmt, { scale:1.08, duration:0.15, ease:'power2.out' }, '<')
        .to(totalAmt, { scale:1, duration:0.2, ease:'power2.in' });
    })();

    /* Chapter 02 — Capture: email -> arrow draws -> entry stamps in */
    (function(){
      var email = document.getElementById('c2Email');
      var arrow = document.getElementById('c2Arrow');
      var row = document.getElementById('c2Row');
      if (!email) return;
      gsap.set(arrow, { autoAlpha:0, y:-18 });
      gsap.set(row, { autoAlpha:0, y:34, scale:0.82 });
      gsap.set(email, { autoAlpha:0, y:-24, scale:0.9 });

      gsap.timeline({ scrollTrigger:{ trigger:'#chapter-2', start:'top 65%' } })
        .to(email, { autoAlpha:1, y:0, scale:1, duration:0.5, ease:'power3.out' })
        .to(arrow, { autoAlpha:1, y:0, duration:0.4, ease:'power2.out' }, '+=0.1')
        .to(row, { autoAlpha:1, y:0, scale:1, duration:0.5, ease:'power3.out' }, '+=0.1');
    })();

    /* Chapter 03 — Security: scan sweeps the inbox, only receipts get pulled, badge locks in */
    (function(){
      var rows = ['c3R1','c3R2','c3R3','c3R4'].map(function(id){ return document.getElementById(id); }).filter(Boolean);
      var badge = document.getElementById('c3Badge');
      if (!rows.length) return;
      gsap.set(rows, { autoAlpha:0.5, y:12 });
      gsap.set(badge, { autoAlpha:0, scale:0.7, y:10 });

      var tl = gsap.timeline({ scrollTrigger:{ trigger:'#chapter-3', start:'top 65%' } });
      rows.forEach(function(row, i){
        tl.to(row, {
          autoAlpha:1, y:0, duration:0.35, ease:'power2.out',
          onComplete:function(){
            row.classList.toggle('sec-hit', row.dataset.kind === 'receipt');
            row.classList.toggle('sec-dim', row.dataset.kind === 'personal');
          }
        }, i === 0 ? 0 : '+=0.12');
      });
      tl.to(badge, { autoAlpha:1, scale:1, y:0, duration:0.4, ease:'power2.out' }, '+=0.15');
    })();

    /* Chapter 04 — Categorize: row plain -> stamp lands -> settle flash */
    (function(){
      var stamp = document.getElementById('c4Stamp');
      var row = document.getElementById('c4Row');
      var amt = document.getElementById('c4Amt');
      if (!stamp) return;
      gsap.set(stamp, { autoAlpha:0, scale:2.2, rotate:14 });
      gsap.set(row, { scale:0.94 });

      gsap.timeline({ scrollTrigger:{ trigger:'#chapter-4', start:'top 65%' } })
        .to(row, { scale:1, duration:0.3, ease:'power2.out' })
        .to(stamp, { autoAlpha:1, scale:1, rotate:0, duration:0.5, ease:'back.out(1.6)' }, '-=0.1')
        .to(row, { backgroundColor:'rgba(33,56,107,0.14)', duration:0.2, ease:'power2.out' }, '-=0.1')
        .to(amt, { scale:1.16, duration:0.2, ease:'power2.out' }, '<')
        .to(row, { backgroundColor:'rgba(33,56,107,0)', duration:0.3, ease:'power2.in' })
        .to(amt, { scale:1, duration:0.2, ease:'power2.in' }, '<');
    })();

    /* Chapter 05 — Split: one entry -> carbon-copy peels into two columns */
    (function(){
      var unified = document.getElementById('c5Unified');
      var cols = document.getElementById('c5Cols');
      var you = document.getElementById('c5You');
      var sam = document.getElementById('c5Sam');
      if (!unified) return;
      gsap.set(cols, { autoAlpha:0 });
      gsap.set(you, { x:90, autoAlpha:0, rotate:6 });
      gsap.set(sam, { x:-90, autoAlpha:0, rotate:-6 });

      gsap.timeline({ scrollTrigger:{ trigger:'#chapter-5', start:'top 65%' } })
        .to(unified, { autoAlpha:0, scale:0.9, y:-16, duration:0.35, ease:'power2.in', delay:0.4 })
        .set(cols, { autoAlpha:1 })
        .to(you, { autoAlpha:1, x:0, rotate:0, duration:0.45, ease:'power3.out' }, '-=0.1')
        .to(sam, { autoAlpha:1, x:0, rotate:0, duration:0.45, ease:'power3.out' }, '<');
    })();

    /* Chapter 06 — Reconcile: label -> figure counts up -> note carries forward */
    (function(){
      var label = document.getElementById('c6Label');
      var figure = document.getElementById('c6Figure');
      var note = document.getElementById('c6Note');
      if (!label) return;
      gsap.set(label, { autoAlpha:0, y:-14 });
      gsap.set(figure, { autoAlpha:0, scale:0.6 });
      gsap.set(note, { autoAlpha:0, y:10 });
      var counter = { val:0 };

      gsap.timeline({ scrollTrigger:{ trigger:'#chapter-6', start:'top 65%' } })
        .to(label, { autoAlpha:1, y:0, duration:0.35, ease:'power2.out' })
        .to(figure, { autoAlpha:1, scale:1, duration:0.4, ease:'back.out(1.6)' }, '-=0.1')
        .to(counter, {
          val:18.20, duration:0.6, ease:'power2.out',
          onUpdate:function(){ figure.textContent = 'Rs ' + counter.val.toFixed(2); }
        }, '<')
        .to(note, { autoAlpha:1, y:0, duration:0.35, ease:'power2.out' }, '+=0.1');
    })();

    /* Insight dashboard — metrics count up and bars rise into view. */
    document.querySelectorAll('[data-insight-count]').forEach(function(el){
      var target = parseInt(el.dataset.insightCount, 10) || 0;
      var obj = { val:0 };
      gsap.to(obj, {
        val:target, duration:1.15, ease:'power2.out',
        scrollTrigger:{ trigger:'#insight', start:'top 72%' },
        onUpdate:function(){ el.textContent = 'Rs ' + Math.round(obj.val).toLocaleString('en-LK'); }
      });
    });
    gsap.utils.toArray('#insight .bar').forEach(function(bar, i){
      gsap.to(bar, {
        scaleY:1, duration:.75, delay:i*.07, ease:'power3.out',
        scrollTrigger:{ trigger:'#dashboardPreview', start:'top 72%' }
      });
    });

    /* Product-story navigation follows the section in view. */
    var storyLinks = gsap.utils.toArray('.story-link');
    storyLinks.forEach(function(link){
      link.addEventListener('click', function(){
        var target = document.getElementById(link.dataset.storyTarget);
        if (target) target.scrollIntoView({ behavior:'smooth', block:'center' });
      });
    });
    var storyTargets = ['chapter-1','chapter-2','chapter-3','chapter-4','chapter-5','chapter-6','insight'];
    storyTargets.forEach(function(id, idx){
      var target = document.getElementById(id);
      if (!target) return;
      ScrollTrigger.create({
        trigger:target, start:'top 45%', end:'bottom 45%',
        onEnter:function(){ storyLinks.forEach(function(l,i){ l.classList.toggle('active', i===idx); }); },
        onEnterBack:function(){ storyLinks.forEach(function(l,i){ l.classList.toggle('active', i===idx); }); }
      });
    });

    gsap.timeline({ scrollTrigger: { trigger:'#features', start:'top 75%' } })
      .from('[data-anim="feat"]', { autoAlpha:0, y:20, duration:0.55, stagger:0.06, ease:'power2.out' });

    gsap.timeline({ scrollTrigger: { trigger:'#final', start:'top 65%' } })
      .from('[data-anim="final"]', { autoAlpha:0, y:26, duration:0.8, ease:'power3.out' })
      .from('.sign-line', { autoAlpha:0, duration:0.5 }, '-=0.3');

    /* ---- running margin: entry number tracks active chapter ---- */
    var marginEntry = document.getElementById('marginEntry');
    var chapters = gsap.utils.toArray('[data-chapter]');
    chapters.forEach(function(ch){
      ScrollTrigger.create({
        trigger: ch, start:'top 50%', end:'bottom 50%',
        onEnter: function(){ marginEntry.textContent = String(parseInt(ch.dataset.chapter,10)+1).padStart(2,'0'); },
        onEnterBack: function(){ marginEntry.textContent = String(parseInt(ch.dataset.chapter,10)+1).padStart(2,'0'); }
      });
    });
    ScrollTrigger.create({
      trigger:'#hero', start:'top top', end:'bottom top',
      onLeaveBack: function(){ marginEntry.textContent = '00'; }
    });
    ScrollTrigger.create({
      trigger:'#final', start:'top 50%',
      onEnter: function(){ marginEntry.textContent = '08'; },
      onLeaveBack: function(){}
    });

  });

  mm.add('(max-width: 700px)', function(){
    gsap.utils.toArray('[data-anim], .chapter-text > *, .chapter-stage .leaf, .feature-card, .donut-wrap').forEach(function(el){
      gsap.from(el, {
        autoAlpha:0, y:18, duration:0.55, ease:'power2.out',
        scrollTrigger: { trigger:el, start:'top 90%' }
      });
    });
    setStaticCounts();
  });

})();
