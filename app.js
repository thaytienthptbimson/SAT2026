/**
 * Digital SAT Master Suite - Application Logic (app.js)
 * Điều khiển giao diện Ôn tập Lý thuyết, 80 Bài tập Áp dụng và Phòng thi Bluebook 10 Đề thi thử
 */
    // Application State
    let state = {
      mainView: 'part1', // 'part1' | 'part2' | 'dashboard'
      topicFilter: 'all',
      activeTopicId: TOPICS_DATA[0].id,
      topicSubMode: 'theory', // 'theory' | 'exercises'
      // Part 1 user answers: { [questionId]: { selected: number, checked: boolean } }
      part1Answers: {},
      // Part 2 exam state:
      // examAttempts: { [examId]: { completed: boolean, reviewMode: boolean, moduleIdx: number, questionIdx: number, answers: { [qId]: number }, flagged: { [qId]: boolean }, eliminated: { [qId_optIdx]: boolean }, remainingSeconds: number, scaledTotal: number, scaledRW: number, scaledMath: number } }
      examAttempts: {},
      activeExamId: null,
      eliminatorActive: false,
      timerVisible: true,
      timerPaused: false
    };

    let examTimerInterval = null;

    // Safe localStorage wrapper
    function loadSavedState() {
      try {
        const raw = localStorage.getItem('digital_sat_suite_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.part1Answers) state.part1Answers = parsed.part1Answers;
          if (parsed.examAttempts) state.examAttempts = parsed.examAttempts;
        }
      } catch (e) {
        // Ignore storage errors in sandboxed frames
      }
    }

    function saveState() {
      try {
        localStorage.setItem('digital_sat_suite_v1', JSON.stringify({
          part1Answers: state.part1Answers,
          examAttempts: state.examAttempts
        }));
      } catch (e) {
        // Ignore storage errors
      }
      updateGlobalStats();
    }

    function showToast(message) {
      const container = document.getElementById('toast-container');
      const msgEl = document.getElementById('toast-msg');
      if (!container || !msgEl) return;
      msgEl.textContent = message;
      container.classList.remove('hidden');
      setTimeout(() => {
        container.classList.add('hidden');
      }, 2600);
    }

    // -----------------------------------------------------------------------
    // MAIN VIEW NAVIGATION
    // -----------------------------------------------------------------------
    function switchMainView(viewName) {
      state.mainView = viewName;
      const views = ['part1', 'part2', 'dashboard'];
      views.forEach(v => {
        const sec = document.getElementById('view-' + v);
        const btn = document.getElementById('nav-tab-' + v);
        if (sec) {
          if (v === viewName) sec.classList.remove('hidden');
          else sec.classList.add('hidden');
        }
        if (btn) {
          if (v === viewName) {
            btn.className = 'px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all bg-blue-600 text-white shadow';
          } else {
            btn.className = 'px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all text-slate-300 hover:text-white hover:bg-slate-700/60';
          }
        }
      });

      if (viewName === 'part1') {
        renderTopicSidebar();
        renderActiveTopic();
      } else if (viewName === 'part2') {
        if (!state.activeExamId) {
          renderExamCatalog();
        }
      } else if (viewName === 'dashboard') {
        populateSourceCodeViewer();
        updateGlobalStats();
      }
    }

    // -----------------------------------------------------------------------
    // PART 1: THEORY & 80 APPLIED EXERCISES (8 TOPICS x 10 QUESTIONS)
    // -----------------------------------------------------------------------
    function filterTopicSidebar(sectionFilter) {
      state.topicFilter = sectionFilter;
      const mapBtn = {
        'all': 'filter-sec-all',
        'Reading & Writing': 'filter-sec-rw',
        'Math': 'filter-sec-math'
      };
      Object.keys(mapBtn).forEach(k => {
        const el = document.getElementById(mapBtn[k]);
        if (!el) return;
        if (k === sectionFilter) {
          el.className = 'py-1.5 rounded-lg bg-white text-slate-900 shadow-sm';
        } else {
          el.className = 'py-1.5 rounded-lg text-slate-600 hover:text-slate-900';
        }
      });
      renderTopicSidebar();
    }

    function getTopicProgress(topic) {
      let done = 0;
      let correct = 0;
      topic.exercises.forEach(ex => {
        const ans = state.part1Answers[ex.id];
        if (ans && typeof ans.selected === 'number') {
          done++;
          if (ans.selected === ex.answer) correct++;
        }
      });
      return { done, correct, total: topic.exercises.length };
    }

    function renderTopicSidebar() {
      const listEl = document.getElementById('topic-sidebar-list');
      if (!listEl) return;

      const filtered = TOPICS_DATA.filter(t => state.topicFilter === 'all' || t.section === state.topicFilter);
      let html = '';

      filtered.forEach(t => {
        const isActive = t.id === state.activeTopicId;
        const prog = getTopicProgress(t);
        const isRW = t.section === 'Reading & Writing';
        const badgeColor = isRW ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800';
        const cardStyle = isActive
          ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50';

        html += `
          <button type="button" onclick="selectTopic('${t.id}')" class="w-full text-left p-3.5 rounded-xl border transition-all ${cardStyle}">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-[11px] font-bold px-2 py-0.5 rounded ${badgeColor}">${t.code} • ${t.section}</span>
              <span class="text-xs font-bold mono-num ${prog.done === 10 ? 'text-emerald-700' : 'text-slate-500'}">${prog.done}/10 bài</span>
            </div>
            <div class="font-bold text-sm text-slate-900 line-clamp-1">${t.title}</div>
            <div class="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div class="bg-blue-600 h-full rounded-full transition-all" style="width: ${(prog.done / 10) * 100}%"></div>
            </div>
          </button>
        `;
      });

      listEl.innerHTML = html;
    }

    function selectTopic(topicId) {
      state.activeTopicId = topicId;
      renderTopicSidebar();
      renderActiveTopic();
    }

    function switchTopicMode(mode) {
      state.topicSubMode = mode;
      const btnTheory = document.getElementById('subtab-theory');
      const btnEx = document.getElementById('subtab-exercises');
      const panelTheory = document.getElementById('topic-theory-panel');
      const panelEx = document.getElementById('topic-exercises-panel');

      if (mode === 'theory') {
        btnTheory.className = 'px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-white text-blue-700 shadow-sm transition-all';
        btnEx.className = 'px-4 py-2 rounded-lg text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition-all';
        panelTheory.classList.remove('hidden');
        panelEx.classList.add('hidden');
      } else {
        btnEx.className = 'px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-white text-blue-700 shadow-sm transition-all';
        btnTheory.className = 'px-4 py-2 rounded-lg text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition-all';
        panelTheory.classList.add('hidden');
        panelEx.classList.remove('hidden');
      }
    }

    function renderActiveTopic() {
      const topic = TOPICS_DATA.find(t => t.id === state.activeTopicId) || TOPICS_DATA[0];
      const prog = getTopicProgress(topic);

      document.getElementById('active-topic-badge').textContent = `${topic.code} • ${topic.section}`;
      document.getElementById('active-topic-weight').textContent = topic.weight;
      document.getElementById('active-topic-title').textContent = topic.title;
      document.getElementById('active-topic-summary').textContent = topic.summary;
      document.getElementById('active-topic-q-progress').textContent = `${prog.done}/10`;
      document.getElementById('active-topic-score-text').textContent = `${prog.correct}/10`;

      // Render Theory Panel
      const theoryEl = document.getElementById('topic-theory-panel');
      const rulesHtml = topic.theory.rules.map(r => `
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <h5 class="font-bold text-sm text-slate-900 mb-1">${r.name}</h5>
          <p class="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">${r.desc}</p>
        </div>
      `).join('');

      const trapsHtml = topic.theory.traps.map(tr => `
        <li class="flex items-start gap-2 text-xs sm:text-sm text-rose-900">
          <span class="font-bold text-rose-600 shrink-0">⚠️</span>
          <span>${tr}</span>
        </li>
      `).join('');

      theoryEl.innerHTML = `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
          <div>
            <h4 class="text-base font-extrabold text-slate-900 mb-2">1. Tổng quan &amp; Trọng tâm Kiến thức</h4>
            <p class="text-sm text-slate-700 leading-relaxed">${topic.theory.overview}</p>
          </div>

          <div>
            <h4 class="text-base font-extrabold text-slate-900 mb-3">2. Quy tắc, Công thức &amp; Chiến thuật Cốt lõi</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${rulesHtml}
            </div>
          </div>

          <div class="p-4 rounded-xl bg-rose-50 border border-rose-200">
            <h4 class="text-sm font-extrabold text-rose-900 mb-2">3. Các Bẫy SAT Thường gặp (Common College Board Traps)</h4>
            <ul class="space-y-2">
              ${trapsHtml}
            </ul>
          </div>

          <div class="p-4 rounded-xl bg-blue-50/80 border border-blue-200">
            <div class="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">4. Ví dụ Minh họa &amp; Phân tích mẫu</div>
            <p class="serif-passage text-xs sm:text-sm text-slate-800 bg-white p-3.5 rounded-lg border border-blue-100 my-2">${topic.theory.example.passage}</p>
            <div class="text-xs sm:text-sm font-bold text-slate-900 mb-1">Câu hỏi: ${topic.theory.example.question}</div>
            <div class="text-xs sm:text-sm text-blue-950"><strong>Phân tích:</strong> ${topic.theory.example.analysis}</div>
          </div>

          <div class="pt-2 flex justify-end">
            <button type="button" onclick="switchTopicMode('exercises')" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow">
              Chuyển sang làm 10 Bài tập Áp dụng của Chuyên đề này →
            </button>
          </div>
        </div>
      `;

      // Render 10 Applied Exercises Panel
      renderTopicExercises(topic);
      switchTopicMode(state.topicSubMode);
    }

    function renderTopicExercises(topic) {
      const pillsEl = document.getElementById('topic-exercise-pills');
      const listEl = document.getElementById('topic-exercises-list');
      if (!pillsEl || !listEl) return;

      let pillsHtml = '';
      let cardsHtml = '';

      topic.exercises.forEach((ex, idx) => {
        const qNum = idx + 1;
        const userRec = state.part1Answers[ex.id] || { selected: null, checked: false, showHint: false };
        const isAnswered = typeof userRec.selected === 'number';
        const isChecked = !!userRec.checked;
        const isCorrect = isAnswered && userRec.selected === ex.answer;

        let pillClass = 'bg-slate-100 text-slate-700 border-slate-300';
        if (isChecked) {
          pillClass = isCorrect ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-rose-600 text-white border-rose-600';
        } else if (isAnswered) {
          pillClass = 'bg-blue-600 text-white border-blue-600';
        }

        pillsHtml += `
          <button type="button" onclick="scrollToExercise('${ex.id}')" class="w-8 h-8 rounded-lg border text-xs font-bold mono-num transition-all ${pillClass}">
            ${qNum}
          </button>
        `;

        const optionsHtml = ex.options.map((optText, optIdx) => {
          const isSelected = userRec.selected === optIdx;
          let optStyle = 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800';
          let badgeText = '';

          if (isChecked) {
            if (optIdx === ex.answer) {
              optStyle = 'border-emerald-500 bg-emerald-50/90 text-emerald-950 font-semibold ring-1 ring-emerald-500';
              badgeText = '<span class="text-xs font-bold text-emerald-700 shrink-0">✓ Đáp án đúng</span>';
            } else if (isSelected && optIdx !== ex.answer) {
              optStyle = 'border-rose-400 bg-rose-50 text-rose-900';
              badgeText = '<span class="text-xs font-bold text-rose-600 shrink-0">✕ Bạn chọn</span>';
            }
          } else if (isSelected) {
            optStyle = 'border-blue-600 bg-blue-50/80 text-blue-950 font-semibold ring-1 ring-blue-600';
          }

          return `
            <button type="button" onclick="selectPart1Option('${ex.id}', ${optIdx})" class="w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs sm:text-sm ${optStyle}">
              <span>${optText}</span>
              ${badgeText}
            </button>
          `;
        }).join('');

        cardsHtml += `
          <article id="card-${ex.id}" class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs mono-num">Bài ${qNum} / 10</span>
                <span class="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">${ex.type}</span>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" onclick="togglePart1Hint('${ex.id}')" class="text-xs font-semibold px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100">
                  💡 Gợi ý tư duy
                </button>
                <button type="button" onclick="checkPart1Single('${ex.id}')" class="text-xs font-bold px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
                  Kiểm tra đáp án
                </button>
              </div>
            </div>

            <!-- Passage / Problem Statement -->
            <div class="serif-passage text-xs sm:text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200/80 whitespace-pre-line">${ex.passage}</div>

            <!-- Question Stem -->
            <div class="font-bold text-sm sm:text-base text-slate-900">${ex.question}</div>

            <!-- Hint Box -->
            <div class="${userRec.showHint ? '' : 'hidden'} p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <strong>Gợi ý:</strong> ${ex.hint}
            </div>

            <!-- Options -->
            <div class="space-y-2">
              ${optionsHtml}
            </div>

            <!-- Explanation Box -->
            <div class="${isChecked ? '' : 'hidden'} p-4 rounded-xl ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'} border text-xs sm:text-sm space-y-1">
              <div class="font-bold ${isCorrect ? 'text-emerald-900' : 'text-blue-900'}">
                ${isCorrect ? '🎉 Chính xác!' : (isAnswered ? '📌 Chưa chính xác — Hãy xem phân tích bên dưới:' : '📖 Lời giải & Phân tích chi tiết:')}
              </div>
              <p class="text-slate-800 leading-relaxed">${ex.explanation}</p>
            </div>
          </article>
        `;
      });

      pillsEl.innerHTML = pillsHtml;
      listEl.innerHTML = cardsHtml;
    }

    function scrollToExercise(exId) {
      const el = document.getElementById('card-' + exId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function selectPart1Option(exId, optIdx) {
      const prev = state.part1Answers[exId] || { selected: null, checked: false, showHint: false };
      state.part1Answers[exId] = {
        ...prev,
        selected: optIdx,
        checked: true // Auto-check on selection for immediate feedback
      };
      saveState();
      renderTopicSidebar();
      renderActiveTopic();
    }

    function togglePart1Hint(exId) {
      const prev = state.part1Answers[exId] || { selected: null, checked: false, showHint: false };
      state.part1Answers[exId] = { ...prev, showHint: !prev.showHint };
      renderActiveTopic();
    }

    function checkPart1Single(exId) {
      const prev = state.part1Answers[exId] || { selected: null, checked: false, showHint: false };
      state.part1Answers[exId] = { ...prev, checked: !prev.checked };
      saveState();
      renderActiveTopic();
    }

    function checkAllTopicExercises() {
      const topic = TOPICS_DATA.find(t => t.id === state.activeTopicId);
      if (!topic) return;
      topic.exercises.forEach(ex => {
        const prev = state.part1Answers[ex.id] || { selected: null, checked: false, showHint: false };
        state.part1Answers[ex.id] = { ...prev, checked: true };
      });
      saveState();
      renderActiveTopic();
      showToast('Đã hiển thị lời giải chi tiết cho cả 10 bài tập!');
    }

    function resetCurrentTopicProgress() {
      const topic = TOPICS_DATA.find(t => t.id === state.activeTopicId);
      if (!topic) return;
      topic.exercises.forEach(ex => {
        delete state.part1Answers[ex.id];
      });
      saveState();
      renderTopicSidebar();
      renderActiveTopic();
      showToast('Đã đặt lại tiến độ 10 bài tập của chuyên đề này.');
    }

    // -----------------------------------------------------------------------
    // PART 2: 10 DIGITAL SAT MOCK EXAMS (BLUEBOOK INTERFACE)
    // -----------------------------------------------------------------------
    function ensureExamAttempt(examId) {
      if (!state.examAttempts[examId]) {
        state.examAttempts[examId] = {
          completed: false,
          reviewMode: false,
          moduleIdx: 0,
          questionIdx: 0,
          answers: {},
          flagged: {},
          eliminated: {},
          remainingSeconds: 32 * 60,
          scaledTotal: null,
          scaledRW: null,
          scaledMath: null
        };
      }
      return state.examAttempts[examId];
    }

    function renderExamCatalog() {
      stopExamTimer();
      state.activeExamId = null;
      document.getElementById('exam-catalog-view').classList.remove('hidden');
      document.getElementById('exam-runner-view').classList.add('hidden');
      document.getElementById('exam-result-view').classList.add('hidden');

      const gridEl = document.getElementById('exam-cards-grid');
      if (!gridEl) return;

      let html = '';
      EXAMS_DATA.forEach(ex => {
        const att = state.examAttempts[ex.id];
        const answeredCount = att ? Object.keys(att.answers || {}).length : 0;
        const isDone = att && att.completed;

        let statusBadge = `<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">Chưa làm (0/20 câu)</span>`;
        if (isDone) {
          statusBadge = `<span class="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">Đã hoàn thành • ${att.scaledTotal} / 1600</span>`;
        } else if (answeredCount > 0) {
          statusBadge = `<span class="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">Đang làm dở (${answeredCount}/20 câu)</span>`;
        }

        html += `
          <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4">
            <div>
              <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span class="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Practice Test #${ex.number} • ${ex.badge}
                </span>
                ${statusBadge}
              </div>
              <h3 class="text-base sm:text-lg font-extrabold text-slate-900">${ex.title}</h3>
              <p class="text-xs sm:text-sm text-slate-600 mt-1">${ex.desc}</p>

              <div class="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                <div class="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/70">
                  <strong class="block text-slate-900">R&amp;W Mod 1</strong>32 phút chuẩn
                </div>
                <div class="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/70">
                  <strong class="block text-slate-900">R&amp;W Mod 2</strong>32 phút (Adaptive)
                </div>
                <div class="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/70">
                  <strong class="block text-slate-900">Math Mod 1</strong>35 phút chuẩn
                </div>
                <div class="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/70">
                  <strong class="block text-slate-900">Math Mod 2</strong>35 phút (Adaptive)
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2 pt-2">
              <span class="text-xs text-slate-500">Độ khó: <strong class="text-slate-700">${ex.difficulty}</strong></span>
              <div class="flex items-center gap-2">
                ${isDone ? `
                  <button type="button" onclick="openExamScoreReport('${ex.id}')" class="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold">
                    📊 Xem điểm &amp; Đáp án
                  </button>
                ` : ''}
                <button type="button" onclick="startMockExam('${ex.id}')" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm">
                  ${isDone ? 'Làm lại / Xem Bluebook →' : (answeredCount > 0 ? 'Tiếp tục làm bài →' : 'Bắt đầu làm đề →')}
                </button>
              </div>
            </div>
          </div>
        `;
      });

      gridEl.innerHTML = html;
      updateGlobalStats();
    }

    function startMockExam(examId) {
      state.activeExamId = examId;
      const att = ensureExamAttempt(examId);
      const exam = EXAMS_DATA.find(e => e.id === examId);
      if (!exam) return;

      document.getElementById('exam-catalog-view').classList.add('hidden');
      document.getElementById('exam-result-view').classList.add('hidden');
      document.getElementById('exam-runner-view').classList.remove('hidden');

      if (!att.remainingSeconds || att.remainingSeconds <= 0) {
        const mod = exam.modules[att.moduleIdx] || exam.modules[0];
        att.remainingSeconds = mod.durationMinutes * 60;
      }

      startExamTimer();
      renderBluebookExamState();
    }

    function exitExamToCatalog() {
      saveState();
      renderExamCatalog();
    }

    function startExamTimer() {
      stopExamTimer();
      state.timerPaused = false;
      examTimerInterval = setInterval(() => {
        if (state.timerPaused || !state.activeExamId) return;
        const att = state.examAttempts[state.activeExamId];
        if (!att || att.completed) return;
        if (att.remainingSeconds > 0) {
          att.remainingSeconds--;
          updateTimerDisplay();
        } else {
          showToast('Hết giờ làm Module hiện tại! Bạn có thể chuyển sang Module tiếp theo.');
          stopExamTimer();
        }
      }, 1000);
      updateTimerDisplay();
    }

    function stopExamTimer() {
      if (examTimerInterval) {
        clearInterval(examTimerInterval);
        examTimerInterval = null;
      }
    }

    function updateTimerDisplay() {
      const display = document.getElementById('bb-timer-display');
      if (!display || !state.activeExamId) return;
      const att = state.examAttempts[state.activeExamId];
      if (!state.timerVisible) {
        display.textContent = '••:••';
        return;
      }
      const secs = att ? Math.max(0, att.remainingSeconds) : 0;
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function toggleExamTimerPause() {
      state.timerPaused = !state.timerPaused;
      const btn = document.getElementById('bb-timer-pause-btn');
      if (btn) btn.textContent = state.timerPaused ? 'Tiếp tục' : 'Tạm dừng';
    }

    function toggleExamTimerVisibility() {
      state.timerVisible = !state.timerVisible;
      updateTimerDisplay();
    }

    function toggleDirectionsModal() {
      const box = document.getElementById('bb-directions-box');
      if (box) box.classList.toggle('hidden');
    }

    function toggleReferenceModal() {
      const modal = document.getElementById('modal-reference');
      if (modal) modal.classList.toggle('hidden');
    }

    function toggleCalculatorModal() {
      const modal = document.getElementById('modal-calculator');
      if (modal) modal.classList.toggle('hidden');
    }

    function toggleEliminatorMode() {
      state.eliminatorActive = !state.eliminatorActive;
      const btn = document.getElementById('bb-eliminator-btn');
      const status = document.getElementById('bb-eliminator-status');
      if (btn) {
        btn.className = state.eliminatorActive
          ? 'px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow'
          : 'px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center gap-1.5';
      }
      if (status) {
        status.textContent = state.eliminatorActive ? 'Chế độ gạch đáp án: ĐANG BẬT' : 'Chế độ gạch đáp án: Tắt';
      }
      renderBluebookExamState();
    }

    function switchExamModule(modIdx) {
      if (!state.activeExamId) return;
      const exam = EXAMS_DATA.find(e => e.id === state.activeExamId);
      const att = ensureExamAttempt(state.activeExamId);
      if (!exam || modIdx < 0 || modIdx >= exam.modules.length) return;
      att.moduleIdx = modIdx;
      att.questionIdx = 0;
      att.remainingSeconds = exam.modules[modIdx].durationMinutes * 60;
      saveState();
      renderBluebookExamState();
    }

    function goToNextExamModule() {
      if (!state.activeExamId) return;
      const exam = EXAMS_DATA.find(e => e.id === state.activeExamId);
      const att = ensureExamAttempt(state.activeExamId);
      if (att.moduleIdx + 1 < exam.modules.length) {
        switchExamModule(att.moduleIdx + 1);
        showToast(`Đã chuyển sang ${exam.modules[att.moduleIdx].shortName}`);
      } else {
        submitCurrentExam();
      }
    }

    function navigateExamQuestion(delta) {
      if (!state.activeExamId) return;
      const exam = EXAMS_DATA.find(e => e.id === state.activeExamId);
      const att = ensureExamAttempt(state.activeExamId);
      const mod = exam.modules[att.moduleIdx];
      const nextIdx = att.questionIdx + delta;
      if (nextIdx >= 0 && nextIdx < mod.questions.length) {
        att.questionIdx = nextIdx;
        renderBluebookExamState();
      } else if (nextIdx >= mod.questions.length && att.moduleIdx + 1 < exam.modules.length) {
        switchExamModule(att.moduleIdx + 1);
      }
    }

    function jumpToExamQuestion(qIdx) {
      if (!state.activeExamId) return;
      const att = ensureExamAttempt(state.activeExamId);
      att.questionIdx = qIdx;
      renderBluebookExamState();
    }

    function toggleFlagCurrentExamQuestion() {
      if (!state.activeExamId) return;
      const exam = EXAMS_DATA.find(e => e.id === state.activeExamId);
      const att = ensureExamAttempt(state.activeExamId);
      const q = exam.modules[att.moduleIdx].questions[att.questionIdx];
      att.flagged[q.id] = !att.flagged[q.id];
      saveState();
      renderBluebookExamState();
    }

    function selectExamOption(qId, optIdx) {
      if (!state.activeExamId) return;
      const att = ensureExamAttempt(state.activeExamId);
      const elimKey = `${qId}_${optIdx}`;
      if (state.eliminatorActive) {
        att.eliminated[elimKey] = !att.eliminated[elimKey];
      } else {
        if (att.eliminated[elimKey]) delete att.eliminated[elimKey];
        att.answers[qId] = optIdx;
      }
      saveState();
      renderBluebookExamState();
    }

    function toggleEliminateSingleOption(event, qId, optIdx) {
      event.stopPropagation();
      if (!state.activeExamId) return;
      const att = ensureExamAttempt(state.activeExamId);
      const elimKey = `${qId}_${optIdx}`;
      att.eliminated[elimKey] = !att.eliminated[elimKey];
      saveState();
      renderBluebookExamState();
    }

    function renderBluebookExamState() {
      if (!state.activeExamId) return;
      const exam = EXAMS_DATA.find(e => e.id === state.activeExamId);
      const att = ensureExamAttempt(state.activeExamId);
      const mod = exam.modules[att.moduleIdx];
      const q = mod.questions[att.questionIdx];

      document.getElementById('bb-exam-badge').textContent = `Đề #${exam.number}`;
      document.getElementById('bb-module-title').textContent = mod.name;
      document.getElementById('bb-directions-text').textContent = mod.directions;
      document.getElementById('bb-q-domain-label').textContent = `${q.domain} • ${q.skill}`;
      document.getElementById('bb-q-section-tag').textContent = mod.section;
      document.getElementById('bb-q-passage').textContent = q.passage;
      document.getElementById('bb-q-number-badge').textContent = String(att.questionIdx + 1);
      document.getElementById('bb-q-stem').textContent = q.question;

      // Render 4 Module tabs
      const modTabsEl = document.getElementById('bb-module-tabs');
      modTabsEl.innerHTML = exam.modules.map((m, idx) => {
        const active = idx === att.moduleIdx;
        const doneInMod = m.questions.filter(item => typeof att.answers[item.id] === 'number').length;
        return `
          <button type="button" onclick="switchExamModule(${idx})" class="px-3 py-2 rounded-xl text-left text-xs font-bold transition-all border ${active ? 'bg-blue-600 text-white border-blue-500 shadow' : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'}">
            <div class="flex items-center justify-between">
              <span>${m.shortName}</span>
              <span class="mono-num text-[11px] ${active ? 'text-blue-100' : 'text-slate-400'}">${doneInMod}/${m.questions.length}</span>
            </div>
          </button>
        `;
      }).join('');

      // Flag button state
      const isFlagged = !!att.flagged[q.id];
      const flagBtn = document.getElementById('bb-flag-btn');
      const flagText = document.getElementById('bb-flag-text');
      if (isFlagged) {
        flagBtn.className = 'text-xs font-bold px-2.5 py-1 rounded-md border border-amber-400 bg-amber-100 text-amber-900 flex items-center gap-1.5';
        flagText.textContent = 'Flagged for Review';
      } else {
        flagBtn.className = 'text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5';
        flagText.textContent = 'Mark for Review';
      }

      // Render Options
      const optsContainer = document.getElementById('bb-q-options');
      const selectedOpt = att.answers[q.id];
      optsContainer.innerHTML = q.options.map((optText, optIdx) => {
        const isSelected = selectedOpt === optIdx;
        const isElim = !!att.eliminated[`${q.id}_${optIdx}`];

        let cardClass = 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800';
        let reviewTag = '';

        if (att.completed) {
          if (optIdx === q.answer) {
            cardClass = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-500';
            reviewTag = '<span class="text-xs font-bold text-emerald-700 shrink-0">✓ Đáp án đúng</span>';
          } else if (isSelected && optIdx !== q.answer) {
            cardClass = 'border-rose-400 bg-rose-50 text-rose-900';
            reviewTag = '<span class="text-xs font-bold text-rose-600 shrink-0">✕ Bạn chọn</span>';
          }
        } else if (isSelected) {
          cardClass = 'border-blue-600 bg-blue-50/90 text-blue-950 font-semibold ring-2 ring-blue-600/20';
        }

        return `
          <div class="flex items-center gap-2">
            <button type="button" onclick="selectExamOption('${q.id}', ${optIdx})" class="flex-1 text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs sm:text-sm ${cardClass} ${isElim ? 'option-eliminated' : ''}">
              <span>${optText}</span>
              ${reviewTag}
            </button>
            <button type="button" onclick="toggleEliminateSingleOption(event, '${q.id}', ${optIdx})" title="Gạch bỏ phương án này" class="px-2.5 py-3.5 rounded-xl border text-xs font-bold mono-num ${isElim ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700'}">
              <s>${['A','B','C','D'][optIdx]}</s>
            </button>
          </div>
        `;
      }).join('');

      // Explanation box if exam completed
      const expBox = document.getElementById('bb-q-explanation-box');
      const expText = document.getElementById('bb-q-explanation-text');
      if (att.completed) {
        expBox.classList.remove('hidden');
        expText.textContent = q.explanation;
      } else {
        expBox.classList.add('hidden');
      }

      // Render Question Palette for current module
      const paletteEl = document.getElementById('bb-question-palette');
      paletteEl.innerHTML = mod.questions.map((item, idx) => {
        const isCurr = idx === att.questionIdx;
        const hasAns = typeof att.answers[item.id] === 'number';
        const hasFlag = !!att.flagged[item.id];
        let btnClass = 'bg-slate-100 text-slate-700 border-slate-300';
        if (isCurr) {
          btnClass = 'bg-slate-900 text-white border-slate-900 ring-2 ring-blue-400';
        } else if (att.completed) {
          btnClass = att.answers[item.id] === item.answer
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-rose-600 text-white border-rose-600';
        } else if (hasAns) {
          btnClass = 'bg-blue-600 text-white border-blue-600';
        }
        return `
          <button type="button" onclick="jumpToExamQuestion(${idx})" class="relative w-8 h-8 rounded-lg border text-xs font-bold mono-num ${btnClass}">
            ${idx + 1}
            ${hasFlag ? '<span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white"></span>' : ''}
          </button>
        `;
      }).join('');

      // Total answered & flagged count across all 4 modules
      let totalQ = 0;
      let totalAns = 0;
      let totalFlag = 0;
      exam.modules.forEach(m => {
        m.questions.forEach(item => {
          totalQ++;
          if (typeof att.answers[item.id] === 'number') totalAns++;
          if (att.flagged[item.id]) totalFlag++;
        });
      });
      document.getElementById('bb-total-answered-count').textContent = `${totalAns} / ${totalQ}`;
      document.getElementById('bb-total-flagged-count').textContent = String(totalFlag);

      updateTimerDisplay();
    }

    function submitCurrentExam() {
      if (!state.activeExamId) return;
      const exam = EXAMS_DATA.find(e => e.id === state.activeExamId);
      const att = ensureExamAttempt(state.activeExamId);
      stopExamTimer();

      let rwCorrect = 0;
      let rwTotal = 0;
      let mathCorrect = 0;
      let mathTotal = 0;

      exam.modules.forEach(m => {
        m.questions.forEach(q => {
          const isRight = att.answers[q.id] === q.answer;
          if (m.section === 'Reading & Writing') {
            rwTotal++;
            if (isRight) rwCorrect++;
          } else {
            mathTotal++;
            if (isRight) mathCorrect++;
          }
        });
      });

      // Official 200-800 scaled score calculation per section
      const scaledRW = Math.round((200 + (rwCorrect / Math.max(1, rwTotal)) * 600) / 10) * 10;
      const scaledMath = Math.round((200 + (mathCorrect / Math.max(1, mathTotal)) * 600) / 10) * 10;

      att.completed = true;
      att.scaledRW = scaledRW;
      att.scaledMath = scaledMath;
      att.scaledTotal = scaledRW + scaledMath;
      att.rwCorrect = rwCorrect;
      att.rwTotal = rwTotal;
      att.mathCorrect = mathCorrect;
      att.mathTotal = mathTotal;

      saveState();
      openExamScoreReport(exam.id);
      showToast(`Đã chấm điểm Đề #${exam.number}: ${att.scaledTotal} / 1600 điểm!`);
    }

    function openExamScoreReport(examId) {
      stopExamTimer();
      state.activeExamId = examId;
      const exam = EXAMS_DATA.find(e => e.id === examId);
      const att = ensureExamAttempt(examId);
      if (!att.completed) {
        submitCurrentExam();
        return;
      }

      document.getElementById('exam-catalog-view').classList.add('hidden');
      document.getElementById('exam-runner-view').classList.add('hidden');
      document.getElementById('exam-result-view').classList.remove('hidden');

      document.getElementById('res-exam-title').textContent = exam.title;
      document.getElementById('res-total-scaled').textContent = String(att.scaledTotal);
      document.getElementById('res-rw-scaled').textContent = String(att.scaledRW);
      document.getElementById('res-rw-raw').textContent = `Đúng ${att.rwCorrect} / ${att.rwTotal} câu (Thang 200–800)`;
      document.getElementById('res-math-scaled').textContent = String(att.scaledMath);
      document.getElementById('res-math-raw').textContent = `Đúng ${att.mathCorrect} / ${att.mathTotal} câu (Thang 200–800)`;

      const breakdownEl = document.getElementById('res-questions-breakdown');
      let html = '';
      exam.modules.forEach((mod, mIdx) => {
        html += `
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div class="font-extrabold text-sm text-slate-900 border-b border-slate-200 pb-2">${mod.name}</div>
            <div class="space-y-2.5">
              ${mod.questions.map((q, qIdx) => {
                const userAns = att.answers[q.id];
                const isCorrect = userAns === q.answer;
                const letters = ['A', 'B', 'C', 'D'];
                const userLet = typeof userAns === 'number' ? letters[userAns] : 'Chưa chọn';
                const corrLet = letters[q.answer];
                return `
                  <div class="bg-white p-3.5 rounded-xl border ${isCorrect ? 'border-emerald-200' : 'border-rose-200'} text-xs sm:text-sm space-y-1.5">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <span class="font-bold text-slate-900">Câu ${qIdx + 1} (${q.domain} — ${q.skill})</span>
                      <span class="font-bold px-2.5 py-0.5 rounded-md ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                        ${isCorrect ? '✓ Đúng' : '✕ Sai / Chưa làm'} • Bạn chọn: ${userLet} | Đáp án đúng: ${corrLet}
                      </span>
                    </div>
                    <p class="text-slate-700">${q.question}</p>
                    <p class="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100"><strong>Giải thích:</strong> ${q.explanation}</p>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      });
      breakdownEl.innerHTML = html;
    }

    function reviewExamInBluebook() {
      if (!state.activeExamId) return;
      document.getElementById('exam-result-view').classList.add('hidden');
      document.getElementById('exam-runner-view').classList.remove('hidden');
      renderBluebookExamState();
    }

    function retakeCurrentExam() {
      if (!state.activeExamId) return;
      const examId = state.activeExamId;
      delete state.examAttempts[examId];
      saveState();
      startMockExam(examId);
      showToast('Đã tạo lượt làm bài mới cho đề thi này!');
    }

    // -----------------------------------------------------------------------
    // SCIENTIFIC CALCULATOR FUNCTIONS
    // -----------------------------------------------------------------------
    function appendCalc(token) {
      const inp = document.getElementById('calc-input');
      if (!inp) return;
      inp.value += token;
      inp.focus();
    }

    function clearCalcInput() {
      const inp = document.getElementById('calc-input');
      const res = document.getElementById('calc-result-text');
      if (inp) inp.value = '';
      if (res) res.textContent = '0';
    }

    function evaluateCalc() {
      const inp = document.getElementById('calc-input');
      const res = document.getElementById('calc-result-text');
      if (!inp || !res) return;
      const expr = inp.value.trim();
      if (!expr) {
        res.textContent = '0';
        return;
      }
      try {
        // Safe math evaluation allowing numbers, arithmetic operators, parentheses, and Math.*
        const sanitized = expr.replace(/[^0-9+\-*/().%\sMathsqrtpowabsincostanPI]/g, '');
        const val = Function('"use strict"; return (' + sanitized + ')')();
        res.textContent = Number.isFinite(val) ? String(Math.round(val * 1000000) / 1000000) : 'Lỗi phép tính';
      } catch (e) {
        res.textContent = 'Biểu thức không hợp lệ';
      }
    }

    // -----------------------------------------------------------------------
    // GLOBAL STATS & SOURCE CODE VIEWER
    // -----------------------------------------------------------------------
    function updateGlobalStats() {
      // Part 1 stats
      let p1Done = 0;
      let p1Correct = 0;
      TOPICS_DATA.forEach(t => {
        t.exercises.forEach(ex => {
          const rec = state.part1Answers[ex.id];
          if (rec && typeof rec.selected === 'number') {
            p1Done++;
            if (rec.selected === ex.answer) p1Correct++;
          }
        });
      });
      const acc = p1Done > 0 ? Math.round((p1Correct / p1Done) * 100) : 0;

      const elP1Done = document.getElementById('p1-stat-completed');
      const elP1Acc = document.getElementById('p1-stat-correct');
      if (elP1Done) elP1Done.textContent = `${p1Done} / 80`;
      if (elP1Acc) elP1Acc.textContent = `${acc}%`;

      // Part 2 stats
      let examsDone = 0;
      let bestScore = null;
      EXAMS_DATA.forEach(ex => {
        const att = state.examAttempts[ex.id];
        if (att && att.completed) {
          examsDone++;
          if (bestScore === null || att.scaledTotal > bestScore) {
            bestScore = att.scaledTotal;
          }
        }
      });

      const elP2Done = document.getElementById('p2-stat-exams-done');
      const elP2Best = document.getElementById('p2-stat-best-score');
      if (elP2Done) elP2Done.textContent = `${examsDone} / 10`;
      if (elP2Best) elP2Best.textContent = bestScore !== null ? `${bestScore}` : '—';

      // Dashboard cards
      const dP1 = document.getElementById('dash-p1-count');
      const dP1Acc = document.getElementById('dash-p1-acc');
      const dP2 = document.getElementById('dash-p2-count');
      const dBest = document.getElementById('dash-best-sat');
      if (dP1) dP1.textContent = `${p1Done} / 80`;
      if (dP1Acc) dP1Acc.textContent = `Độ chính xác: ${acc}% (${p1Correct} câu đúng)`;
      if (dP2) dP2.textContent = `${examsDone} / 10`;
      if (dBest) dBest.textContent = bestScore !== null ? `${bestScore} / 1600` : 'Chưa có điểm';
    }

    function populateSourceCodeViewer() {
      const viewer = document.getElementById('source-code-viewer');
      if (!viewer) return;
      viewer.value = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    }

    function copyFullSourceCode() {
      const viewer = document.getElementById('source-code-viewer');
      if (!viewer) return;
      populateSourceCodeViewer();
      viewer.select();
      try {
        document.execCommand('copy');
        showToast('Đã sao chép toàn bộ mã nguồn HTML vào bộ nhớ tạm!');
      } catch (e) {
        showToast('Hãy nhấn Ctrl+C trên ô mã nguồn để sao chép.');
      }
    }

    function resetAllAppData() {
      state.part1Answers = {};
      state.examAttempts = {};
      state.activeExamId = null;
      try {
        localStorage.removeItem('digital_sat_suite_v1');
      } catch (e) {}
      saveState();
      renderTopicSidebar();
      renderActiveTopic();
      showToast('Đã xóa toàn bộ lịch sử làm bài và đặt lại về ban đầu.');
    }

    // Initialize Application on Load
    window.addEventListener('DOMContentLoaded', () => {
      loadSavedState();
      updateGlobalStats();
      renderTopicSidebar();
      renderActiveTopic();
    });
