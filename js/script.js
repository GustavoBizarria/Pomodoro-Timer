  const CIRCUMFERENCE = 2 * Math.PI * 100;

  const state = {
    mode: 'focus',  
    running: false,
    secondsLeft: 25 * 60,
    totalSeconds: 25 * 60,
    pomodorosTotal: 0,
    focusMinutes: 0,
    streak: 0,
    cycleCount: 0,   
    sessionNumber: 1,
  };

  const cfg = () => ({
    focus:  parseInt(document.getElementById('setFocus').value)  || 25,
    short:  parseInt(document.getElementById('setShort').value)  || 5,
    long:   parseInt(document.getElementById('setLong').value)   || 15,
    cycles: parseInt(document.getElementById('setCycles').value) || 4,
  });

  const COLORS = { focus: '#ff6b35', short: '#3dd6ac', long: '#7b6cf6' };

  let ticker = null;

  const timeDisplay   = document.getElementById('timeDisplay');
  const sessionLabel  = document.getElementById('sessionLabel');
  const ringArc       = document.getElementById('ringArc');
  const btnStartStop  = document.getElementById('btnStartStop');
  const btnReset      = document.getElementById('btnReset');
  const btnSkip       = document.getElementById('btnSkip');
  const tomatoRow     = document.getElementById('tomatoRow');
  const statPomodoros = document.getElementById('statPomodoros');
  const statFocusTime = document.getElementById('statFocusTime');
  const statStreak    = document.getElementById('statStreak');
  const toastEl       = document.getElementById('toast');
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel  = document.getElementById('settingsPanel');
  const modeBtns = document.querySelectorAll('.mode-btn');

  /* ── Accent color helper ─────────────────────────────────── */
  function setAccent(mode) {
    const c = COLORS[mode];
    document.documentElement.style.setProperty('--accent', c);
    document.documentElement.style.setProperty('--active-color', c);
  }

  /* ── Render ──────────────────────────────────────────────── */
  function renderTime() {
    const m = Math.floor(state.secondsLeft / 60).toString().padStart(2, '0');
    const s = (state.secondsLeft % 60).toString().padStart(2, '0');
    timeDisplay.textContent = `${m}:${s}`;
    document.title = `${m}:${s} — Pomodoro`;

    // Ring arc
    const progress = state.secondsLeft / state.totalSeconds;
    const offset = CIRCUMFERENCE * (1 - progress);
    ringArc.style.strokeDashoffset = offset;
  }

  function renderTomatoes() {
    const total = cfg().cycles;
    tomatoRow.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const t = document.createElement('span');
      t.className = 'tomato' + (i < state.cycleCount ? ' done' : '');
      t.textContent = '🍅';
      t.setAttribute('aria-label', i < state.cycleCount ? 'sessão completa' : 'sessão pendente');
      tomatoRow.appendChild(t);
    }
  }

  function renderSessionLabel() {
    const labels = { focus: 'Foco', short: 'Pausa curta', long: 'Pausa longa' };
    sessionLabel.textContent = state.mode === 'focus'
      ? `Sessão ${state.cycleCount + 1} de ${cfg().cycles}`
      : labels[state.mode];
  }

  function renderStats() {
    statPomodoros.textContent = state.pomodorosTotal;
    statFocusTime.textContent = state.focusMinutes >= 60
      ? `${Math.floor(state.focusMinutes / 60)}h ${state.focusMinutes % 60}m`
      : `${state.focusMinutes}m`;
    statStreak.textContent = state.streak;
  }

  function render() {
    renderTime();
    renderTomatoes();
    renderSessionLabel();
    renderStats();
    btnStartStop.textContent = state.running ? 'PAUSAR' : 'INICIAR';
  }

  /* ── Timer logic ─────────────────────────────────────────── */
  function startTimer() {
    if (state.running) return;
    state.running = true;
    ticker = setInterval(tick, 1000);
    render();
  }

  function pauseTimer() {
    state.running = false;
    clearInterval(ticker);
    render();
  }

  function tick() {
    state.secondsLeft--;
    if (state.secondsLeft <= 0) {
      onSessionEnd();
    } else {
      renderTime();
    }
  }

  function onSessionEnd() {
    clearInterval(ticker);
    state.running = false;

    if (state.mode === 'focus') {
      state.pomodorosTotal++;
      state.focusMinutes += cfg().focus;
      state.streak++;
      state.cycleCount++;

      if (state.cycleCount >= cfg().cycles) {
        state.cycleCount = 0;
        switchMode('long');
        showToast('🌿 Ótimo trabalho! Hora de uma pausa longa.');
      } else {
        switchMode('short');
        showToast('☕ Pomodoro completo! Faça uma pausa.');
      }
    } else {
      switchMode('focus');
      showToast('🍅 Pausa encerrada. Hora de focar!');
    }

    playBeep();
    renderStats();
  }

  function switchMode(mode, manual = false) {
    state.mode = mode;
    if (manual) {
      pauseTimer();
      if (mode === 'focus') { state.cycleCount = 0; }
    }

    const durations = { focus: cfg().focus, short: cfg().short, long: cfg().long };
    state.totalSeconds = durations[mode] * 60;
    state.secondsLeft  = state.totalSeconds;

    // Sync tab highlight
    modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    setAccent(mode);
    render();
  }

  function resetTimer() {
    pauseTimer();
    const durations = { focus: cfg().focus, short: cfg().short, long: cfg().long };
    state.totalSeconds = durations[state.mode] * 60;
    state.secondsLeft  = state.totalSeconds;
    render();
  }

  function skipSession() {
    clearInterval(ticker);
    state.running = false;
    onSessionEnd();
  }

  /* ── Beep ────────────────────────────────────────────────── */
  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.35);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.4);
      });
    } catch(e) { /* silent fail */ }
  }

  /* ── Toast ───────────────────────────────────────────────── */
  let toastTimeout;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 3500);
  }

  /* ── Event listeners ─────────────────────────────────────── */
  btnStartStop.addEventListener('click', () => {
    state.running ? pauseTimer() : startTimer();
  });
  btnReset.addEventListener('click', () => { resetTimer(); });
  btnSkip.addEventListener('click', skipSession);

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode, true));
  });

  settingsToggle.addEventListener('click', () => {
    const open = settingsPanel.classList.toggle('open');
    settingsToggle.setAttribute('aria-expanded', open);
    if (!open) resetTimer(); // apply new values on close
  });

  // Re-apply settings on input change
  document.querySelectorAll('.settings-panel input').forEach(inp => {
    inp.addEventListener('change', () => { if (!state.running) resetTimer(); });
  });

  /* ── Keyboard shortcuts ──────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); btnStartStop.click(); }
    if (e.code === 'KeyR')  resetTimer();
    if (e.code === 'KeyS')  skipSession();
  });

  /* ── Init ────────────────────────────────────────────────── */
  setAccent('focus');
  render();
