// ==========================================
// CONFIGURAÇÃO
// ==========================================
const STORAGE_KEY = "cubeTimerHistoryV3";
const LANGUAGE_KEY = "cubeTimerLanguage";
const INSPECTION_SECONDS = 15;

// ==========================================
// ELEMENTOS
// ==========================================
const cubeTypeElement = document.getElementById("cubeType");
const inspectionEnabledElement = document.getElementById("inspectionEnabled");
const languageSelect = document.getElementById("languageSelect");
const scrambleElement = document.getElementById("scramble");
const scrambleCubeTypeElement = document.getElementById("scrambleCubeType");
const newScrambleButton = document.getElementById("newScramble");
const timerElement = document.getElementById("timer");
const timerStatusElement = document.getElementById("timerStatus");
const timerHelpElement = document.getElementById("timerHelp");
const timerSectionElement = document.querySelector(".timer-section");
const clearHistoryButton = document.getElementById("clearHistory");
const historyElement = document.getElementById("history");
const solveCountElement = document.getElementById("solveCount");
const bestTimeElement = document.getElementById("bestTime");
const ao5Element = document.getElementById("ao5");
const ao12Element = document.getElementById("ao12");


// ==========================================
// TRADUÇÕES
// ==========================================
const translations = {
    "pt-BR": {
        title: "Cube Timer",
        subtitle: "Timer, scrambles e histórico de solves",
        language: "Idioma",
        cube: "Cubo",
        inspection: "Inspeção de 15 segundos",
        scramble: "Scramble",
        newScramble: "Novo scramble",
        ready: "Pronto",

        timerHelpDesktop: "Pressione ESPAÇO para iniciar",
        timerHelpMobile: "Toque para iniciar",

        solves: "Solves",
        best: "Melhor",
        history: "Histórico",
        clearHistory: "Limpar histórico",

        inspectionRunning: "Inspeção",
        inspectionRunningWithSeconds: "Inspeção — {seconds}s",
        inspectionHelp: "Você tem 15 segundos para inspecionar o cubo",
        inspectionExceeded: "DNF — inspeção excedida",
        dnfHelp: "O solve foi registrado como DNF",

        timing: "Cronometrando",

        stopHelpDesktop: "Pressione ESPAÇO para parar",
        stopHelpMobile: "Toque para parar",

        finished: "Solve finalizado",

        noHistory: "Nenhum solve ainda.",
        confirmClear: "Tem certeza que deseja apagar todo o histórico?",
        deleteTitle: "Excluir solve",
        copyTitle: "Copiar solve",
        copied: "Solve copiada!",

        dnf: "DNF"
    },

    "en": {
        title: "Cube Timer",
        subtitle: "Timer, scrambles and solve history",
        language: "Language",
        cube: "Cube",
        inspection: "15-second inspection",
        scramble: "Scramble",
        newScramble: "New scramble",
        ready: "Ready",

        timerHelpDesktop: "Press SPACE to start",
        timerHelpMobile: "Tap to start",

        solves: "Solves",
        best: "Best",
        history: "History",
        clearHistory: "Clear history",

        inspectionRunning: "Inspection",
        inspectionRunningWithSeconds: "Inspection — {seconds}s",
        inspectionHelp: "You have 15 seconds to inspect the cube",
        inspectionExceeded: "DNF — inspection exceeded",
        dnfHelp: "The solve was recorded as DNF",

        timing: "Timing",

        stopHelpDesktop: "Press SPACE to stop",
        stopHelpMobile: "Tap to stop",

        finished: "Solve finished",

        noHistory: "No solves yet.",
        confirmClear: "Are you sure you want to clear the entire history?",
        deleteTitle: "Delete solve",
        copyTitle: "Copy solve",
        copied: "Solve copied!",

        dnf: "DNF"
    }
};

let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || "pt-BR";

// ==========================================
// ESTADO
// ==========================================
let history = loadHistory();
let currentScramble = "";
let currentCubeType = cubeTypeElement.value;
let timerState = "idle";
// idle       = parado
// inspection = inspeção
// running   = cronômetro rodando

let startTime = 0;
let inspectionStartTime = 0;
let timerInterval = null;

let touchHoldTimer = null;
let touchHoldActive = false;
let touchHoldReady = false;
let touchStartX = 0;
let touchStartY = 0;

const TOUCH_HOLD_TIME = 1000;
const TOUCH_MOVE_THRESHOLD = 15;

// ==========================================
// LOCAL STORAGE
// ==========================================
function loadHistory() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
        return [];
    }
    try {
        const data = JSON.parse(saved);

        return data.map(solve => ({
            id: solve.id || crypto.randomUUID(),
            time:
                solve.time === null
                    ? null
                    : Number(solve.time),
            scramble: solve.scramble || "",
            date: solve.date || Date.now(),
            cubeType: solve.cubeType || "3x3",
            dnf: Boolean(solve.dnf)
        }));
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        return [];
    }
}

function saveHistory() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(history)
    );
}


// ==========================================
// IDIOMA
// ==========================================
function t(key, replacements = {}) {
    let text =
        translations[currentLanguage][key] ||
        translations["pt-BR"][key] ||
        key;

    Object.entries(replacements).forEach(
        ([name, value]) => {
            text = text.replace(
                `{${name}}`,
                value
            );
        }
    );
    return text;
}

function applyLanguage() {
    document.documentElement.lang = currentLanguage;
    document
        .querySelectorAll("[data-i18n]")
        .forEach(element => {
            const key = element.dataset.i18n;
            element.textContent = t(key);
        });
    languageSelect.value = currentLanguage;
    renderDynamicText();
    renderHistory();
}

function renderDynamicText() {
    if (timerState === "idle") {
        if (timerStatusElement.classList.contains("dnf")) {
            timerStatusElement.textContent = t("inspectionExceeded");
            timerHelpElement.textContent = t("dnfHelp");
            return;
        }
        timerStatusElement.textContent = t("ready");
        timerHelpElement.textContent = getStartHelp();
        return;
    }
    if (timerState === "inspection") {
        timerStatusElement.textContent = t("inspectionRunning");
        timerHelpElement.textContent = t("inspectionHelp");
        return;
    }
    if (timerState === "running") {
        timerStatusElement.textContent = t("timing");
        timerHelpElement.textContent = getStopHelp();
    }
}

languageSelect.addEventListener("change", () => {
        currentLanguage = languageSelect.value;
        localStorage.setItem(LANGUAGE_KEY, currentLanguage);
        applyLanguage();
    }
);

// ==========================================
// SCRAMBLES
// ==========================================
const BASIC_MOVES = ["R", "L", "U", "D", "F", "B"];
const BASIC_MODIFIERS = ["", "'", "2"];
const WIDE_MOVES = {
    "4x4": ["R", "L", "U", "D", "F", "B", "Rw", "Lw", "Uw", "Dw", "Fw", "Bw"],
    "5x5": ["R", "L", "U", "D", "F", "B", "Rw", "Lw", "Uw", "Dw", "Fw", "Bw", "3Rw", "3Lw", "3Uw", "3Dw", "3Fw", "3Bw"]
};

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getFace(move) {
    return move.replace(/[^RLUDFB]/g, "");
}

function generateScramble(cubeType) {
    let length;
    if (cubeType === "3x3") {
        length = 20;
    } else if (cubeType === "4x4") {
        length = 40;
    } else {
        length = 60;
    }

    const moves = cubeType === "3x3" ? BASIC_MOVES: WIDE_MOVES[cubeType];
    const scramble = [];
    let previousFace = null;

    while (scramble.length < length) {
        const move = randomItem(moves);
        const face = getFace(move);

        if (face === previousFace) {
            continue;
        }

        const modifier = randomItem(BASIC_MODIFIERS);
        scramble.push(move + modifier);
        previousFace = face;
    }
    return scramble.join(" ");
}

function createNewScramble() {
    currentCubeType = cubeTypeElement.value;
    currentScramble = generateScramble(currentCubeType);
    scrambleCubeTypeElement.textContent = currentCubeType;
    scrambleElement.textContent = currentScramble;
    resetTimerDisplay();
}

// ==========================================
// TIMER
// ==========================================
function resetTimerDisplay() {
    clearInterval(timerInterval);
    timerState = "idle";
    timerElement.textContent = "0.00";
    timerStatusElement.textContent = t("ready");
    timerStatusElement.className = "timer-status";
    timerHelpElement.textContent = getTimerHelp();
    timerElement.classList.remove("running");
    timerElement.classList.remove("ready-to-start");
}

function beginAction() {
    if (timerState === "idle") {
        if (inspectionEnabledElement.checked) {
            startInspection();
        } else {
            startSolveTimer();
        }
        return;
    }

    if (timerState === "inspection") {
        startSolveTimer();
        return;
    }

    if (timerState === "running") {
        stopSolveTimer();
    }
}

function isTouchDevice() {
    return ("ontouchstart" in window || navigator.maxTouchPoints > 0);
}

function getStartHelp() {
    return isTouchDevice() ? t("timerHelpMobile") : t("timerHelpDesktop");
}

function getStopHelp() {
    return isTouchDevice() ? t("stopHelpMobile") : t("stopHelpDesktop");
}

// ==========================================
// INSPEÇÃO
// ==========================================
function startInspection() {
    clearInterval(timerInterval);

    timerState = "inspection";
    inspectionStartTime = performance.now();
    timerStatusElement.textContent = t("inspectionRunning");
    timerStatusElement.className = "timer-status inspection";
    timerHelpElement.textContent = t("inspectionHelp");

    updateInspection();
    timerInterval = setInterval(updateInspection, 50);
}

function updateInspection() {
    const elapsed = (performance.now() - inspectionStartTime) / 1000;
    const remaining = Math.max(0, INSPECTION_SECONDS - elapsed);
    timerElement.textContent = remaining.toFixed(1);

    if (remaining <= 0) {
        finishInspectionAsDNF();
        return;
    }
    if (remaining <= 5) {
        timerStatusElement.textContent = t("inspectionRunningWithSeconds",{
                    seconds:Math.ceil(remaining)
                }
            );
    } else {
        timerStatusElement.textContent = t("inspectionRunning");
    }
}

function finishInspectionAsDNF() {
    clearInterval(timerInterval);
    timerState = "idle";

    timerElement.textContent = t("dnf");
    timerStatusElement.textContent = t("inspectionExceeded");
    timerStatusElement.className = "timer-status dnf";
    timerHelpElement.textContent = t("dnfHelp");

    addSolve({time: null, dnf: true});

    setTimeout(() => {
        createNewScramble();
    }, 1200);
}


// ==========================================
// CRONÔMETRO
// ==========================================
function startSolveTimer() {
    clearInterval(timerInterval);
    resetTouchHold();

    timerState = "running";
    startTime = performance.now();

    timerElement.classList.remove("ready-to-start");
    timerElement.classList.add("running");

    timerStatusElement.textContent = t("timing");
    timerStatusElement.className = "timer-status";
    timerHelpElement.textContent = getStopHelp();

    timerInterval = setInterval(updateSolveTimer, 10);
}

function updateSolveTimer() {
    const elapsed = (performance.now() - startTime) / 1000;
    timerElement.textContent = formatTime(elapsed);
}

function stopSolveTimer() {
    clearInterval(timerInterval);
    const elapsed = (performance.now() - startTime) / 1000;

    timerState = "idle";
    timerElement.classList.remove("running");
    timerElement.classList.remove("ready-to-start");
    timerElement.textContent = formatTime(elapsed);
    timerStatusElement.textContent = t("finished");
    timerHelpElement.textContent = getStartHelp();

    addSolve({time: elapsed, dnf: false});
    createNewScramble();
}

// ==========================================
// TOQUE / SEGURAR NA TELA
// ==========================================
function resetTouchHold() {
    clearTimeout(touchHoldTimer);
    touchHoldTimer = null;
    touchHoldActive = false;
    touchHoldReady = false;
    timerElement.classList.remove("ready-to-start");
}

function startTouchHold(event) {
    // Só aplica a lógica especial para toque
    if (event.pointerType !== "touch") {
        return;
    }

    // Se o cronômetro estiver rodando, um toque para o cronômetro
    if (timerState === "running") {
        event.preventDefault();
        stopSolveTimer();
        return;
    }

    // Só permite iniciar quando estiver parado
    if (timerState !== "idle") {
        return;
    }
    event.preventDefault();

    touchHoldActive = true;
    touchHoldReady = false;
    touchStartX = event.clientX;
    touchStartY = event.clientY;

    clearTimeout(touchHoldTimer);

    touchHoldTimer = setTimeout(() => {
        if (!touchHoldActive) {
            return;
        }

        touchHoldReady = true;
        timerElement.classList.add("ready-to-start");
    }, TOUCH_HOLD_TIME);
}

function handleTouchMove(event) {
    if (event.pointerType !== "touch" || !touchHoldActive) {
        return;
    }

    const deltaX = Math.abs(event.clientX - touchStartX);
    const deltaY = Math.abs(event.clientY - touchStartY);

    if (
        deltaX > TOUCH_MOVE_THRESHOLD ||
        deltaY > TOUCH_MOVE_THRESHOLD
    ) {
        resetTouchHold();
    }
}

function finishTouchHold(event) {
    if (event.pointerType !== "touch" || !touchHoldActive) {
        return;
    }

    event.preventDefault();

    const shouldStart = touchHoldReady;

    resetTouchHold();

    // O cronômetro só começa quando o dedo é solto depois de completar os 2 segundos
    if (shouldStart && timerState === "idle") {
        startSolveTimer();
    }
}

function cancelTouchHold(event) {
    if (event.pointerType !== "touch") {
        return;
    }

    resetTouchHold();
}

// ==========================================
// TECLADO
// ==========================================
document.addEventListener(
    "keydown",
    event => {
        if (event.code !== "Space") {
            return;
        }
        event.preventDefault();
        beginAction();
    }
);

// ==========================================
// TOQUE NA TELA
// ==========================================
timerSectionElement.addEventListener("pointerdown", startTouchHold);
timerSectionElement.addEventListener("pointermove", handleTouchMove);
timerSectionElement.addEventListener("pointerup", finishTouchHold);
timerSectionElement.addEventListener("pointercancel", cancelTouchHold);
timerSectionElement.addEventListener( "pointerleave", event => {
    if (event.pointerType === "touch") {
            resetTouchHold();
        }
    }
);

// ==========================================
// HISTÓRICO
// ==========================================
function addSolve(result) {
    const solve = {
        id: crypto.randomUUID(),
        time: result.time,
        dnf: Boolean(result.dnf),
        scramble: currentScramble,
        cubeType: currentCubeType,
        date: Date.now()
    };

    history.push(solve);
    saveHistory();
    renderHistory();
    updateStats();
}

function deleteSolve(id) {
    history = history.filter(
        solve => solve.id !== id
    );
    saveHistory();
    renderHistory();
    updateStats();
}

function formatTime(seconds) {
    if (seconds === null || seconds === undefined) {
        return t("dnf");
    }
    return Number(seconds).toFixed(2);
}

function formatDate(timestamp) {
    const date = new Date(timestamp);

    return date.toLocaleDateString(currentLanguage,{
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

// ==========================================
// COPIAR SOLVE
// ==========================================
async function copySolve(id) {
    const solve = history.find(item => item.id === id);

    if (!solve) {
        return;
    }
    const time = solve.dnf ? t("dnf"): `${formatTime(solve.time)}s`;
    const text = `${solve.cubeType} | ${time} | ` + `${formatDate(solve.date)} | ` + `${solve.scramble}`;
    try {
        await navigator.clipboard.writeText(text);
        showCopyFeedback(id);

    } catch (error) {
        /*
            Fallback para ambientes onde
            navigator.clipboard não está disponível.
        */
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
        showCopyFeedback(id);
    }
}

function showCopyFeedback(id) {
    const button = document.querySelector(`.copy-solve[data-id="${id}"]`);

    if (!button) {
        return;
    }

    const oldText = button.textContent;
    button.textContent = "✓";
    button.title = t("copied");

    setTimeout(() => {button.textContent = oldText;
        button.title = t("copyTitle");
    }, 1000);
}

// ==========================================
// RENDER HISTÓRICO
// ==========================================
function renderHistory() {
    historyElement.innerHTML = "";

    if (history.length === 0) {
        historyElement.innerHTML =
            `<p class="empty-history">
                ${t("noHistory")}
            </p>`;
        return;
    }
    const reversedHistory = [...history].reverse();

    reversedHistory.forEach((solve, index) => {
            const element = document.createElement("div");
            element.className = "solve";

            const number = history.length - index;
            const timeText = solve.dnf ? t("dnf"): `${formatTime(solve.time)}s`;
            const timeClass = solve.dnf ? "solve-time dnf" : "solve-time";

            element.innerHTML = `
                <span class="solve-number">
                    #${number}
                </span>

                <span class="${timeClass}">
                    ${timeText}
                </span>

                <span class="solve-cube">
                    ${solve.cubeType}
                </span>

                <span class="solve-date">
                    ${formatDate(solve.date)}
                </span>

                <span class="solve-scramble">
                    ${solve.scramble}
                </span>

                <button
                    class="action-button copy-solve"
                    data-id="${solve.id}"
                    title="${t("copyTitle")}"
                    aria-label="${t("copyTitle")}">
                    ⧉
                </button>

                <button
                    class="action-button delete-solve"
                    data-id="${solve.id}"
                    title="${t("deleteTitle")}"
                    aria-label="${t("deleteTitle")}">
                    ×
                </button>
            `;
            historyElement.appendChild(element);
        }
    );

    document
        .querySelectorAll(".delete-solve")
        .forEach(button => {
            button.addEventListener("click", () => {
                    deleteSolve(button.dataset.id);
                }
            );
        });

    document
        .querySelectorAll(".copy-solve")
        .forEach(button => {
            button.addEventListener("click", () => {
                    copySolve(button.dataset.id);
                }
            );
        });
}

// ==========================================
// ESTATÍSTICAS
// ==========================================
function getTimedSolves() {
    return history.filter(solve => !solve.dnf && typeof solve.time === "number");
}

function updateStats() {

    solveCountElement.textContent = history.length;
    const timedSolves = getTimedSolves();

    if (timedSolves.length > 0) {
        const best = Math.min(...timedSolves.map(solve => solve.time));
        bestTimeElement.textContent = `${formatTime(best)}s`;

    } else {
        bestTimeElement.textContent = "-";
    }

    ao5Element.textContent = calculateAverage(5);
    ao12Element.textContent = calculateAverage(12);
}

function calculateAverage(count) {
    if (history.length < count) {
        return "-";
    }

    const recent = history.slice(-count);

    if (
        recent.some(solve => solve.dnf)
    ) {
        return t("dnf");
    }

    const times = recent.map(solve => solve.time);
    const sorted = [...times].sort((a, b) => a - b);

    sorted.shift();
    sorted.pop();

    const average = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
    return `${formatTime(average)}s`;
}

// ==========================================
// EVENTOS
// ==========================================
cubeTypeElement.addEventListener("change", () => {
        createNewScramble();
    }
);

newScrambleButton.addEventListener("click", () => {
        createNewScramble();
    }
);

clearHistoryButton.addEventListener("click", () => {

        if (history.length === 0) {
            return;
        }

        if (!confirm(t("confirmClear"))) {
            return;
        }

        history = [];
        saveHistory();
        renderHistory();
        updateStats();
        createNewScramble();
    }
);

// ==========================================
// INICIALIZAÇÃO
// ==========================================
languageSelect.value = currentLanguage;
applyLanguage();
createNewScramble();
renderHistory();
updateStats();
