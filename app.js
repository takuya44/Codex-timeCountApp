/*
  タイマーアプリ（ストップウォッチ / カウントダウン）
  - 設計方針:
    * ストップウォッチは高頻度更新（約60FPS: 16ms）、CD は 50ms で負荷軽減
    * 状態はシンプルなフラット変数で管理（フレームワーク不要）
    * アクセシビリティ: 状態変化を aria-live で読み上げ
  - 主な関数:
    * swStart/swPause/swReset: ストップウォッチ制御
    * cdStart/cdPause/cdReset/cdTick: カウントダウン制御
    * setMode: モード切替（UI の活性/表示と初期化）
*/
(() => {
  'use strict';

  const el = {
    btnStopwatch: document.getElementById('btn-stopwatch'),
    btnCountdown: document.getElementById('btn-countdown'),
    time: document.getElementById('time'),
    status: document.getElementById('status'),
    form: document.getElementById('countdown-form'),
    min: document.getElementById('minutes'),
    sec: document.getElementById('seconds'),
    start: document.getElementById('start'),
    pause: document.getElementById('pause'),
    reset: document.getElementById('reset'),
    lap: document.getElementById('lap'),
    lapList: document.getElementById('lap-list'),
  };

  // モード定義（UI とロジックの分岐に使用）
  const Mode = { STOPWATCH: 'stopwatch', COUNTDOWN: 'countdown' };
  let mode = Mode.STOPWATCH;

  // Stopwatch state（開始時刻/経過/タイマーID）
  let swInterval = null;
  let swStartTs = 0; // performance.now at start
  let swElapsed = 0; // ms accumulated when paused

  // Countdown state（残り時間/タイマーID）
  let cdInterval = null;
  let cdRemain = 0; // ms remaining

  /**
   * モード切替: 見た目の選択状態、入力表示、ラップ可否を更新し、状態を初期化
   */
  function setMode(next) {
    if (mode === next) return;
    mode = next;
    const isSW = mode === Mode.STOPWATCH;
    el.btnStopwatch.classList.toggle('is-active', isSW);
    el.btnCountdown.classList.toggle('is-active', !isSW);
    el.btnStopwatch.setAttribute('aria-selected', String(isSW));
    el.btnCountdown.setAttribute('aria-selected', String(!isSW));
    el.form.style.display = isSW ? 'none' : 'grid';
    el.lap.disabled = !isSW || !!swInterval; // only for stopwatch
    resetAll();
  }

  /**
   * 時刻表示フォーマット（mm:ss.cc）。負値は 0 扱い
   */
  function fmt(ms) {
    const totalMs = Math.max(0, Math.floor(ms));
    const min = Math.floor(totalMs / 60000);
    const sec = Math.floor((totalMs % 60000) / 1000);
    const cs = Math.floor((totalMs % 1000) / 10); // centiseconds
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }

  /**
   * スクリーンリーダーへ状態を通知（aria-live 対応要素に反映）
   */
  function announce(text) {
    el.status.textContent = text;
  }

  // Stopwatch ---------------------------------------------------------------
  /** 描画用 tick（約 60FPS） */
  function swTick() {
    const now = performance.now();
    const elapsed = swElapsed + (now - swStartTs);
    el.time.textContent = fmt(elapsed);
  }

  /** ストップウォッチ開始 */
  function swStart() {
    if (swInterval) return;
    swStartTs = performance.now();
    swInterval = setInterval(swTick, 16);
    el.start.disabled = true;
    el.pause.disabled = false;
    el.reset.disabled = false;
    el.lap.disabled = false;
    announce('ストップウォッチ開始');
  }

  /** ストップウォッチ一時停止（経過を累積） */
  function swPause() {
    if (!swInterval) return;
    clearInterval(swInterval);
    swInterval = null;
    swElapsed += performance.now() - swStartTs;
    el.start.disabled = false;
    el.pause.disabled = true;
    el.reset.disabled = false;
    el.lap.disabled = true;
    announce('ストップウォッチ一時停止');
  }

  /** ストップウォッチ完全リセット（表示/ラップも初期化） */
  function swReset() {
    clearInterval(swInterval);
    swInterval = null;
    swElapsed = 0;
    el.time.textContent = '00:00.00';
    el.start.disabled = false;
    el.pause.disabled = true;
    el.reset.disabled = true;
    el.lap.disabled = true;
    el.lapList.innerHTML = '';
    announce('ストップウォッチリセット');
  }

  /** 現在表示をラップとして追加 */
  function addLap() {
    if (mode !== Mode.STOPWATCH) return;
    const item = document.createElement('li');
    item.textContent = el.time.textContent;
    el.lapList.appendChild(item);
  }

  // Countdown ---------------------------------------------------------------
  /**
   * 入力値（分/秒）から残りミリ秒を算出。無効値は範囲に丸める
   */
  function readCountdownMs() {
    const m = clampInt(el.min.value, 0, 999);
    const s = clampInt(el.sec.value, 0, 59);
    el.min.value = String(m);
    el.sec.value = String(s);
    return m * 60000 + s * 1000;
  }

  /** 数値を整数化して[min, max]にクランプ */
  function clampInt(val, min, max) {
    const n = Math.floor(Number(val));
    if (isNaN(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  /** 残り時間を表示へ反映 */
  function cdRender() {
    el.time.textContent = fmt(cdRemain);
  }

  /**
   * カウントダウン tick（20FPS）。0 以下で停止して完了を通知
   */
  function cdTick() {
    cdRemain -= 50; // 20fps で十分滑らか、負荷軽減
    if (cdRemain <= 0) {
      cdRemain = 0;
      cdRender();
      cdStop(true);
      return;
    }
    cdRender();
  }

  /** カウントダウン開始。0 の場合はエラー表示 */
  function cdStart() {
    if (cdInterval) return;
    cdRemain = readCountdownMs();
    if (cdRemain <= 0) {
      el.min.setAttribute('aria-invalid', 'true');
      el.sec.setAttribute('aria-invalid', 'true');
      announce('有効な時間を入力してください');
      return;
    }
    el.min.removeAttribute('aria-invalid');
    el.sec.removeAttribute('aria-invalid');
    cdRender();
    cdInterval = setInterval(cdTick, 50);
    el.start.disabled = true;
    el.pause.disabled = false;
    el.reset.disabled = false;
    el.lap.disabled = true;
    announce('カウントダウン開始');
  }

  /** カウントダウン一時停止 */
  function cdPause() {
    if (!cdInterval) return;
    clearInterval(cdInterval);
    cdInterval = null;
    el.start.disabled = false;
    el.pause.disabled = true;
    el.reset.disabled = false;
    announce('カウントダウン一時停止');
  }

  /** カウントダウン停止（done=true で完了通知） */
  function cdStop(done = false) {
    clearInterval(cdInterval);
    cdInterval = null;
    el.start.disabled = false;
    el.pause.disabled = true;
    el.reset.disabled = false;
    if (done) announce('カウントダウン完了');
  }

  /** カウントダウンリセット（入力値から再計算） */
  function cdReset() {
    clearInterval(cdInterval);
    cdInterval = null;
    cdRemain = readCountdownMs();
    cdRender();
    el.start.disabled = false;
    el.pause.disabled = true;
    el.reset.disabled = true;
    announce('カウントダウンリセット');
  }

  // Shared controls ---------------------------------------------------------
  /** ボタン群のイベントハンドラ（モードに応じて委譲） */
  function onStart() {
    if (mode === Mode.STOPWATCH) swStart(); else cdStart();
  }
  function onPause() {
    if (mode === Mode.STOPWATCH) swPause(); else cdPause();
  }
  function onReset() {
    if (mode === Mode.STOPWATCH) swReset(); else cdReset();
  }

  /** モードに応じた初期化を実行 */
  function resetAll() {
    if (mode === Mode.STOPWATCH) {
      swReset();
      el.time.textContent = '00:00.00';
    } else {
      cdReset();
    }
  }

  // Event wiring ------------------------------------------------------------
  el.btnStopwatch.addEventListener('click', () => setMode(Mode.STOPWATCH));
  el.btnCountdown.addEventListener('click', () => setMode(Mode.COUNTDOWN));

  el.start.addEventListener('click', onStart);
  el.pause.addEventListener('click', onPause);
  el.reset.addEventListener('click', onReset);
  el.lap.addEventListener('click', addLap);

  // プリセットボタン: data-ms の値で分秒を設定し、CD に切替
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ms = Number(btn.dataset.ms) || 0;
      applyPreset(ms);
    });
  });

  /** 指定ミリ秒をカウントダウンに反映してリセット */
  function applyPreset(ms) {
    if (mode !== Mode.COUNTDOWN) setMode(Mode.COUNTDOWN);
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    el.min.value = String(m);
    el.sec.value = String(s);
    cdReset();
    announce(`${m}分${s ? s + '秒' : ''}に設定`);
  }

  // 便宜上、Enter でカウントダウン開始
  el.form.addEventListener('submit', (e) => { e.preventDefault(); onStart(); });

  // Initialize --------------------------------------------------------------
  (function init() {
    // 既定はストップウォッチ。CD 入力は非表示にしておく
    el.form.style.display = 'none';
    swReset();
  })();
})();
