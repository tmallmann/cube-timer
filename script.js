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
const historyCubeTypeElement = document.getElementById("historyCubeType");

const solveCountElement = document.getElementById("solveCount");
const bestTimeElement = document.getElementById("bestTime");
const ao5Element = document.getElementById("ao5");
const ao12Element = document.getElementById("ao12");

const confirmModal = document.getElementById("confirmModal");
const confirmModalTitle = document.getElementById("confirmModalTitle");
const confirmModalMessage = document.getElementById("confirmModalMessage");
const cancelConfirmButton = document.getElementById("cancelConfirmButton");
const confirmActionButton = document.getElementById("confirmActionButton");

const newRecordBannerElement = document.getElementById("newRecordBanner");

// ==========================================
// TRADUÇÕES
// ==========================================
const translations = {
    "pt-BR": {
        title: "Cube Timer",
        subtitle: "Cronômetro, embaralhamentos e histórico de resoluções",
        language: "Idioma",
        cube: "Cubo",
        inspection: "Inspeção de 15 segundos",
        scramble: "Scramble",
        newScramble: "Novo scramble",

        ready: "Pronto",

        timerHelpDesktop: "Pressione e segure ESPAÇO",
        timerHelpMobile: "Toque e segure",

        releaseSpaceDesktop: "Solte ESPAÇO para iniciar",
        releaseSpaceMobile: "Solte para iniciar",

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
        newRecord: "NOVO RECORDE!",

        noHistory: "Nenhum solve ainda.",
        confirmClear:
            "Tem certeza que deseja apagar todo o histórico?",
        deleteTitle: "Excluir solve",
        copyTitle: "Copiar solve",
        copied: "Solve copiada!",

        dnf: "DNF",

        modalClearTitle: "Limpar histórico",
        modalClearMessage:
            "Tem certeza que deseja apagar todos os solves? Esta ação não pode ser desfeita.",
        cancel: "Cancelar",
        confirmClearAction: "Limpar histórico",
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

        timerHelpDesktop: "Press and hold SPACE",
        timerHelpMobile: "Tap and hold",

        releaseSpaceDesktop: "Release SPACE to start",
        releaseSpaceMobile: "Release to start",

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
        newRecord: "NEW RECORD!",

        noHistory: "No solves yet.",
        confirmClear:
            "Are you sure you want to clear the entire history?",
        deleteTitle: "Delete solve",
        copyTitle: "Copy solve",
        copied: "Solve copied!",

        dnf: "DNF",

        modalClearTitle: "Clear history",
        modalClearMessage:
            "Are you sure you want to delete all solves? This action cannot be undone.",
        cancel: "Cancel",
        confirmClearAction: "Clear history",
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

let startTime = 0;
let inspectionStartTime = 0;
let inspectionPenalty = 0;
let timerInterval = null;

let touchHoldTimer = null;
let touchHoldActive = false;
let touchHoldReady = false;
let touchStartX = 0;
let touchStartY = 0;

const TOUCH_HOLD_TIME = 300;
const TOUCH_MOVE_THRESHOLD = 15;

let spaceKeyHeld = false;
let spaceReady = false;
let spaceHoldTimer = null;

const SPACE_HOLD_TIME = 300;

let newRecordTimeout = null;

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
            time: solve.time === null ? null : Number(solve.time),
            scramble: solve.scramble || "",
            date: solve.date || Date.now(),
            cubeType: solve.cubeType || "3x3",
            dnf: Boolean(solve.dnf),
            plusTwo: Boolean(solve.plusTwo)
        }));
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        return [];
    }
}

function saveHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

// ==========================================
// FILTRO POR MODALIDADE
// ==========================================
function getCurrentCubeType() {
    return cubeTypeElement.value;
}

function getCurrentCubeSolves() {
    const cubeType = getCurrentCubeType();
    return history.filter(solve => solve.cubeType === cubeType);
}

function updateCurrentCubeIndicators() {
    const cubeType = getCurrentCubeType();

    currentCubeType = cubeType;
    scrambleCubeTypeElement.textContent = cubeType;

    if (historyCubeTypeElement) {
        historyCubeTypeElement.textContent = cubeType;
    }
}

// ==========================================
// IDIOMA
// ==========================================
function t(key, replacements = {}) {
    let text = translations[currentLanguage][key] || translations["pt-BR"][key] || key;

    Object.entries(replacements).forEach(([name, value]) => {
        text = text.replace(`{${name}}`, value);
    }
    );

    return text;
}

function applyLanguage() {
    document.documentElement.lang = currentLanguage;
    document.querySelectorAll("[data-i18n]").forEach(element => {
        const key = element.dataset.i18n;
        element.textContent = t(key);
    });

    languageSelect.value = currentLanguage;
    renderDynamicText();
    renderHistory();
    updateStats();
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
});

// ==========================================
// MODAL DE CONFIRMAÇÃO
// ==========================================
let confirmCallback = null;

function openConfirmModal({title, message, confirmText, onConfirm}) {
    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;
    confirmActionButton.textContent = confirmText;

    confirmCallback = onConfirm;
    confirmModal.hidden = false;

    requestAnimationFrame(() => {
        confirmModal.classList.add("visible");
        confirmActionButton.focus();
    });
}

function closeConfirmModal() {
    confirmModal.classList.remove("visible");

    setTimeout(() => {
        confirmModal.hidden = true;
    }, 160);

    confirmCallback = null;
}

confirmActionButton.addEventListener("click", () => {
    if (typeof confirmCallback === "function") {
        confirmCallback();
    }

    closeConfirmModal();
});

cancelConfirmButton.addEventListener("click", closeConfirmModal);

confirmModal.addEventListener("click", event => {
    if (event.target === confirmModal) {
        closeConfirmModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !confirmModal.hidden) {
        closeConfirmModal();
    }
});

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

    const moves = cubeType === "3x3"? BASIC_MOVES: WIDE_MOVES[cubeType];
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
    updateCurrentCubeIndicators();

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
    timerHelpElement.textContent = getStartHelp();
    timerElement.classList.remove("running", "ready-to-start");
    setTimerVisualState("idle");
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
    return isTouchDevice()? t("timerHelpMobile"): t("timerHelpDesktop");
}

function getStopHelp() {
    return isTouchDevice()? t("stopHelpMobile"): t("stopHelpDesktop");
}

function setTimerVisualState(state) {
    timerSectionElement.classList.remove("state-idle", "state-ready", "state-running", "state-inspection", "state-dnf");
    timerSectionElement.classList.add(`state-${state}`);
}

// ==========================================
// INSPEÇÃO
// ==========================================
function startInspection() {
    clearInterval(timerInterval);
    timerState = "inspection";
    inspectionStartTime = performance.now();
    inspectionPenalty = 0;

    timerElement.classList.remove("running", "ready-to-start");
    timerStatusElement.textContent = t("inspectionRunning");
    timerStatusElement.className = "timer-status inspection";
    timerHelpElement.textContent = t("inspectionHelp");

    setTimerVisualState("inspection");
    updateInspection();

    timerInterval = setInterval(updateInspection, 50);
}

function updateInspection() {
    const elapsed = (performance.now() - inspectionStartTime) / 1000;

    if (elapsed < INSPECTION_SECONDS) {
        const remaining = INSPECTION_SECONDS - elapsed;

        timerElement.textContent = remaining.toFixed(1);

        if (remaining <= 5) {
            timerStatusElement.textContent = t("inspectionRunningWithSeconds", {seconds: Math.ceil(remaining)});
        } else {
            timerStatusElement.textContent = t("inspectionRunning");
        }

        return;
    }

    if (elapsed < INSPECTION_SECONDS + 2) {
        inspectionPenalty = 2;

        const penaltyRemaining = INSPECTION_SECONDS + 2 - elapsed;
        timerElement.textContent = penaltyRemaining.toFixed(1);
        timerStatusElement.textContent = "+2";
        timerStatusElement.className = "timer-status inspection penalty";
        return;
    }

    finishInspectionAsDNF();
}

function finishInspectionAsDNF() {
    clearInterval(timerInterval);

    timerState = "idle";
    inspectionPenalty = 0;

    timerElement.textContent = t("dnf");
    timerStatusElement.textContent = t("inspectionExceeded");
    timerStatusElement.className = "timer-status dnf";
    timerHelpElement.textContent = t("dnfHelp");
    setTimerVisualState("dnf");

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

    const penalty = timerState === "inspection"? inspectionPenalty: 0;

    resetTouchHold();

    timerState = "running";
    startTime = performance.now();
    timerElement.classList.remove("ready-to-start");
    timerElement.classList.add("running");
    timerStatusElement.textContent = t("timing");
    timerStatusElement.className = "timer-status";
    timerHelpElement.textContent = getStopHelp();

    setTimerVisualState("running");

    timerInterval = setInterval(() => {
        updateSolveTimer();
    }, 10);

    window.currentInspectionPenalty = penalty;
}

function updateSolveTimer() {
    const elapsed = (performance.now() - startTime) / 1000;
    timerElement.textContent = formatTime(elapsed);
}

function stopSolveTimer() {
    clearInterval(timerInterval);

    const elapsed = (performance.now() - startTime) / 1000;
    const penalty = window.currentInspectionPenalty || 0;
    const finalTime = elapsed + penalty;
    const recordBroken = isNewRecord(finalTime, currentCubeType);

    timerState = "idle";
    inspectionPenalty = 0;
    window.currentInspectionPenalty = 0;

    timerElement.classList.remove("running", "ready-to-start");
    timerElement.textContent = formatTime(finalTime);
    timerStatusElement.textContent = penalty > 0? `${t("finished")} (+2)`: t("finished");
    timerStatusElement.className = "timer-status";
    timerHelpElement.textContent = getStartHelp();

    setTimerVisualState("idle");
    addSolve({time: finalTime, dnf: false, plusTwo: penalty > 0});

    if (recordBroken) {
        showNewRecordAnimation(finalTime, currentCubeType);
        timerStatusElement.textContent = t("newRecord");
        timerStatusElement.classList.add("new-record-status");

        setTimeout(() => {createNewScramble();}, 2500);

    } else {
        createNewScramble();
    }
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
    if (event.pointerType !== "touch") {
        return;
    }

    if (timerState === "running") {
        event.preventDefault();
        stopSolveTimer();
        return;
    }

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

    if (deltaX > TOUCH_MOVE_THRESHOLD || deltaY > TOUCH_MOVE_THRESHOLD) {
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

    if (shouldStart && timerState === "idle") {
        if (inspectionEnabledElement.checked) {
            startInspection();
        } else {
            startSolveTimer();
        }
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
document.addEventListener("keydown", event => {
    if (event.code !== "Space") {
        return;
    }

    event.preventDefault();

    if (event.repeat) {
        return;
    }

    if (timerState === "running") {
        spaceKeyHeld = true;
        stopSolveTimer();
        return;
    }

    if (spaceKeyHeld) {
        return;
    }

    spaceKeyHeld = true;
    spaceReady = false;

    if (timerState === "inspection") {
        startSolveTimer();
        return;
    }

    if (timerState !== "idle") {
        return;
    }

    clearTimeout(spaceHoldTimer);

    spaceHoldTimer = setTimeout(() => {
        if (!spaceKeyHeld || timerState !== "idle") {
            return;
        }

        spaceReady = true;
        timerElement.classList.add("ready-to-start");
        timerStatusElement.textContent = t("ready");
        timerStatusElement.className = "timer-status";
        timerHelpElement.textContent = isTouchDevice()? t("releaseSpaceMobile"): t("releaseSpaceDesktop");
        setTimerVisualState("ready");
    }, SPACE_HOLD_TIME);
});

document.addEventListener("keyup", event => {
    if (event.code !== "Space") {
        return;
    }

    event.preventDefault();

    if (!spaceKeyHeld) {
        return;
    }

    clearTimeout(spaceHoldTimer);
    spaceHoldTimer = null;

    const wasReady = spaceReady;
    spaceKeyHeld = false;
    spaceReady = false;

    timerElement.classList.remove("ready-to-start");

    if (wasReady && timerState === "idle") {
        if (inspectionEnabledElement.checked) {
            startInspection();
        } else {
            startSolveTimer();
        }
    }
});

// ==========================================
// TOQUE NA TELA
// ==========================================
timerSectionElement.addEventListener("pointerdown", startTouchHold);
timerSectionElement.addEventListener("pointermove", handleTouchMove);
timerSectionElement.addEventListener("pointerup", finishTouchHold);
timerSectionElement.addEventListener("pointercancel", cancelTouchHold);
timerSectionElement.addEventListener("pointerleave", event => {
        if (event.pointerType === "touch") {
            resetTouchHold();
        }
    }
);

// ==========================================
// RECORDE
// ==========================================
function isNewRecord(time, cubeType) {
    if (time === null || time === undefined) {
        return false;
    }

    const previousSolves = history.filter( solve => solve.cubeType === cubeType && !solve.dnf && typeof solve.time === "number");

    // Primeiro solve da modalidade também é um novo recorde
    if (previousSolves.length === 0) {
        return true;
    }

    const bestTime = Math.min(...previousSolves.map(solve => solve.time));
    return time < bestTime;
}

// ==========================================
// ANIMAÇÃO DO RECORDE
// ==========================================
function showNewRecordAnimation(
    time,
    cubeType
) {
    clearTimeout(newRecordTimeout);

    if (!newRecordBannerElement) {
        console.error("Elemento #newRecordBanner não encontrado.");
        return;
    }

    newRecordBannerElement.innerHTML = `<strong>${t("newRecord")}</strong>
        <span>${cubeType} • ${formatTime(time)}s</span>
    `;

    timerSectionElement.classList.remove("new-record");
    newRecordBannerElement.classList.remove("visible");

    // Reinicia a animação
    void newRecordBannerElement.offsetWidth;
    timerSectionElement.classList.add("new-record");
    newRecordBannerElement.classList.add("visible");

    newRecordTimeout = setTimeout(() => {
        timerSectionElement.classList.remove("new-record");
        newRecordBannerElement.classList.remove("visible");
    }, 2500);
}

// ==========================================
// HISTÓRICO
// ==========================================
function addSolve(result) {
    const solve = {
        id: crypto.randomUUID(),
        time: result.time,
        dnf: Boolean(result.dnf),
        plusTwo: Boolean(result.plusTwo),
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
    history = history.filter(solve => solve.id !== id);
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
    return date.toLocaleDateString(currentLanguage,{day: "2-digit", month: "2-digit", year: "numeric"}    );
}

// ==========================================
// COPIAR SOLVE
// ==========================================
async function copySolve(id) {
    const solve = history.find(item => item.id === id);

    if (!solve) {
        return;
    }

    let time;

    if (solve.dnf) {
        time = t("dnf");
    } else {
        time =`${formatTime(solve.time)}s` + (solve.plusTwo ? " (+2)" : "");
    }

    const text = `${solve.cubeType} | ` + `${time} | ` + `${formatDate(solve.date)} | ` + `${solve.scramble}`;

    try {
        await navigator.clipboard.writeText(text);
        showCopyFeedback(id);

    } catch (error) {
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

    const oldText =button.textContent;
    button.textContent = "✓";
    button.title = t("copied");

    setTimeout(() => {
        button.textContent = oldText;
        button.title = t("copyTitle");
    }, 1000);
}

// ==========================================
// RENDER HISTÓRICO
// ==========================================
function renderHistory() {
    historyElement.innerHTML = "";

    updateCurrentCubeIndicators();
    const currentSolves = getCurrentCubeSolves();

    if (currentSolves.length === 0) {
        historyElement.innerHTML = `
            <p class="empty-history">
                ${t("noHistory")}
            </p>
        `;
        return;
    }

    const reversedHistory = [...currentSolves].reverse();

    reversedHistory.forEach(
        (solve, index) => {
            const element = document.createElement("div");
            element.className = "solve";

            const number = currentSolves.length - index;
            const timeText = solve.dnf? t("dnf"): `${formatTime(solve.time)}${solve.plusTwo? ' <span class="plus-two">(+2)</span>': ""}`;
            const timeClass = solve.dnf? "solve-time dnf": "solve-time";

            element.innerHTML = `
                <span class="solve-number">#${number}</span>
                <span class="${timeClass}">${timeText}</span>
                <span class="solve-cube">${solve.cubeType}</span>
                <span class="solve-date">${formatDate(solve.date)}</span>
                <span class="solve-scramble">${solve.scramble}</span>

                <button
                    class="action-button copy-solve"
                    data-id="${solve.id}"
                    title="${t("copyTitle")}"
                    aria-label="${t("copyTitle")}"
                >
                    ⧉
                </button>

                <button
                    class="action-button delete-solve"
                    data-id="${solve.id}"
                    title="${t("deleteTitle")}"
                    aria-label="${t("deleteTitle")}"
                >
                    ×
                </button>
            `;

            historyElement.appendChild(element);
        }
    );

    document.querySelectorAll(".delete-solve").forEach(button => {
            button.addEventListener("click", () => {
                    deleteSolve(button.dataset.id);
                }
            );
        });

    document.querySelectorAll(".copy-solve").forEach(button => {
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
    return getCurrentCubeSolves().filter(solve =>
            !solve.dnf && typeof solve.time === "number"
    );
}

function updateStats() {
    const currentSolves = getCurrentCubeSolves();
    const timedSolves = currentSolves.filter(solve =>
                !solve.dnf && typeof solve.time === "number"
        );

    // SOLVES
    solveCountElement.textContent = currentSolves.length;

    // MELHOR TEMPO
    if (timedSolves.length > 0) {
        const best = Math.min(...timedSolves.map(solve => solve.time));
        bestTimeElement.textContent = `${formatTime(best)}s`;
    } else {
        bestTimeElement.textContent = "-";
    }

    // AO5
    ao5Element.textContent = calculateAverage(5);

    // AO12
    ao12Element.textContent = calculateAverage(12);
}

function calculateAverage(count) {
    const currentSolves = getCurrentCubeSolves();

    if (currentSolves.length < count) {
        return "-";
    }

    const recent = currentSolves.slice(-count);

    // Se houver DNF nos últimos solves, a média é DNF
    if (recent.some(solve => solve.dnf)) {
        return t("dnf");
    }

    const times = recent.map(solve => solve.time);
    const sorted = [...times].sort((a, b) => a - b);

    // Remove o pior e o melhor
    sorted.shift();
    sorted.pop();

    const average = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
    return `${formatTime(average)}s`;
}

// ==========================================
// EVENTOS
// ==========================================
cubeTypeElement.addEventListener("change", () => {
        currentCubeType = cubeTypeElement.value;
        updateCurrentCubeIndicators();
        renderHistory();
        updateStats();
        createNewScramble();
    }
);

newScrambleButton.addEventListener("click", () => {
        createNewScramble();
    }
);

clearHistoryButton.addEventListener("click", () => {
        const currentSolves = getCurrentCubeSolves();

        if (currentSolves.length === 0) {
            return;
        }

        openConfirmModal({
            title: t("modalClearTitle"),
            message: t("modalClearMessage"),
            confirmText: t("confirmClearAction"),

            onConfirm: () => {
                const currentCube = getCurrentCubeType();

                // Remove somente os solves da modalidade selecionada
                history = history.filter(solve =>
                            solve.cubeType !== currentCube
                    );

                saveHistory();
                renderHistory();
                updateStats();
                createNewScramble();
            }
        });
    }
);

// ==========================================
// INICIALIZAÇÃO
// ==========================================
languageSelect.value = currentLanguage;

updateCurrentCubeIndicators();
applyLanguage();
createNewScramble();
renderHistory();
updateStats();
