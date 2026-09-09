/* ============================================================
   Ksyusha_lessons — shared script
   Used by index.html (student name + lesson list) and every
   lessons/*.html page (autosave of exercise answers).

   All localStorage keys are namespaced with "ksyusha_" so this
   site never collides with any other student's site opened in
   the same browser.
   ============================================================ */

const KL = (() => {
  const PREFIX = "ksyusha_";
  const NAME_KEY = PREFIX + "student_name";

  function progressKey(lessonId) {
    return PREFIX + "progress_" + lessonId;
  }

  function getStudentName() {
    return localStorage.getItem(NAME_KEY) || "";
  }

  function setStudentName(name) {
    localStorage.setItem(NAME_KEY, name.trim());
  }

  function loadProgress(lessonId) {
    try {
      return JSON.parse(localStorage.getItem(progressKey(lessonId))) || {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress(lessonId, data) {
    const current = loadProgress(lessonId);
    const merged = Object.assign(current, data);
    localStorage.setItem(progressKey(lessonId), JSON.stringify(merged));
    showSaved();
  }

  function clearProgress(lessonId) {
    localStorage.removeItem(progressKey(lessonId));
  }

  // --- small "Saved" toast shown after any change ---
  let toastTimer = null;
  function showSaved() {
    let el = document.querySelector(".save-status");
    if (!el) {
      el = document.createElement("div");
      el.className = "save-status";
      el.textContent = "Saved";
      document.body.appendChild(el);
    }
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1200);
  }

  // ----------------------------------------------------------
  // Home page: greet student by name, ask once if unknown.
  // ----------------------------------------------------------
  function initHomePage() {
    const greetingEl = document.getElementById("greeting");
    if (!greetingEl) return;

    function render() {
      const name = getStudentName();
      if (name) {
        greetingEl.innerHTML =
          `Hi, <strong>${escapeHtml(name)}</strong>! ` +
          `<button class="btn small secondary" id="changeNameBtn" type="button">change name</button>`;
        document.getElementById("changeNameBtn").addEventListener("click", askName);
      } else {
        greetingEl.textContent = "";
        askName();
      }
    }

    function askName() {
      const input = window.prompt("What's your name?", getStudentName());
      if (input && input.trim()) {
        setStudentName(input);
        render();
      }
    }

    render();
  }

  // ----------------------------------------------------------
  // Lesson pages: wire up autosave + restore for a given
  // lessonId. Call KL.initLessonPage("lesson-01") once the
  // page's exercise markup is in the DOM.
  // ----------------------------------------------------------
  function initLessonPage(lessonId) {
    const data = loadProgress(lessonId);

    // Plain inputs / textareas: any element with [data-save]
    // and an id gets restored + saved on every change.
    document.querySelectorAll("[data-save]").forEach((el) => {
      if (!el.id) {
        console.warn("Element with data-save is missing an id:", el);
        return;
      }
      if (data[el.id] !== undefined) {
        el.value = data[el.id];
      }
      const handler = () => {
        saveProgress(lessonId, { [el.id]: el.value });
        if (el.classList.contains("free-write")) updateWordCount(el);
      };
      el.addEventListener("input", handler);
      if (el.classList.contains("free-write")) updateWordCount(el);
    });

    // Choice groups (pick one of several buttons): restore + save.
    document.querySelectorAll(".choice-group").forEach((group) => {
      if (!group.id) {
        console.warn("choice-group is missing an id:", group);
        return;
      }
      const saved = data[group.id];
      const buttons = group.querySelectorAll(".choice-btn");
      buttons.forEach((btn) => {
        if (saved !== undefined && btn.dataset.value === saved) {
          btn.classList.add("selected");
        }
        btn.addEventListener("click", () => {
          buttons.forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          saveProgress(lessonId, { [group.id]: btn.dataset.value });
        });
      });
    });

    // Matching exercises: restore previously matched pairs.
    document.querySelectorAll(".match-grid").forEach((grid) => {
      const matchId = grid.dataset.matchId;
      if (!matchId) return;
      const savedKey = "match_" + matchId;
      const matchedPairs = data[savedKey] || [];
      matchedPairs.forEach((pairKey) => {
        grid.querySelectorAll(`[data-match="${pairKey}"]`).forEach((el) => {
          el.classList.add("matched");
        });
      });
      wireMatchGrid(grid, lessonId, savedKey, matchedPairs);
    });
  }

  function wireMatchGrid(grid, lessonId, savedKey, matchedPairs) {
    let selected = null;

    grid.querySelectorAll(".match-item").forEach((item) => {
      item.addEventListener("click", () => {
        if (item.classList.contains("matched")) return;

        if (!selected) {
          selected = item;
          item.classList.add("selected");
          return;
        }

        if (selected === item) {
          selected.classList.remove("selected");
          selected = null;
          return;
        }

        const isPair =
          selected.dataset.match === item.dataset.match &&
          selected !== item &&
          selected.dataset.col !== item.dataset.col;

        if (isPair) {
          selected.classList.remove("selected");
          selected.classList.add("matched");
          item.classList.add("matched");
          matchedPairs.push(item.dataset.match);
          saveProgress(lessonId, { [savedKey]: matchedPairs });
          selected = null;
        } else {
          // wrong pair: brief flash, then reset
          item.classList.add("selected");
          setTimeout(() => {
            selected.classList.remove("selected");
            item.classList.remove("selected");
            selected = null;
          }, 350);
        }
      });
    });
  }

  function updateWordCount(textarea) {
    const counter = document.querySelector(`[data-wordcount-for="${textarea.id}"]`);
    if (!counter) return;
    const words = textarea.value.trim().split(/\s+/).filter(Boolean).length;
    counter.textContent = `${words} word${words === 1 ? "" : "s"}`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    getStudentName,
    setStudentName,
    loadProgress,
    saveProgress,
    clearProgress,
    initHomePage,
    initLessonPage,
  };
})();
