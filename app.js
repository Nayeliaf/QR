(function () {
  const config = window.APP_CONFIG;

  const screens = {
    scan: document.getElementById("screen-scan"),
    history: document.getElementById("screen-history"),
    settings: document.getElementById("screen-settings"),
  };

  const tabs = {
    scan: document.getElementById("tabScan"),
    history: document.getElementById("tabHistory"),
    settings: document.getElementById("tabSettings"),
  };

  const historyList = document.getElementById("historyList");
  const count = document.getElementById("count");
  const darkLabel = document.getElementById("darkLabel");

  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalClose = document.getElementById("modalClose");
  const mAvatar = document.getElementById("mAvatar");
  const mName = document.getElementById("mName");
  const mCat = document.getElementById("mCat");
  const mCode = document.getElementById("mCode");
  const mMsg = document.getElementById("mMsg");
  const mStatusOk = document.getElementById("mStatusOk");
  const mStatusBad = document.getElementById("mStatusBad");
  const btnRegister = document.getElementById("btnRegister");
  const btnAlready = document.getElementById("btnAlready");

  const dangerBackdrop = document.getElementById("dangerBackdrop");
  const dangerClose = document.getElementById("dangerClose");
  const dangerText = document.getElementById("dangerText");
  const dangerInput = document.getElementById("dangerInput");
  const dangerConfirm = document.getElementById("dangerConfirm");
  const dangerCancel = document.getElementById("dangerCancel");

  const btnStart = document.getElementById("btnStart");
  const btnStop = document.getElementById("btnStop");
  const scanIdle = document.getElementById("scanIdle");
  const scanLive = document.getElementById("scanLive");
  const camStatus = document.getElementById("camStatus");
  const toggleTheme = document.getElementById("toggleTheme");
  const btnClear = document.getElementById("btnClear");
  const manualCode = document.getElementById("manualCode");
  const btnManualSearch = document.getElementById("btnManualSearch");

  const brandTitle = document.getElementById("brandTitle");
  const brandSubtitle = document.getElementById("brandSubtitle");
  const aboutVersion = document.getElementById("aboutVersion");

  let currentAttendee = null;
  let scannerActive = false;

  brandTitle.textContent = config.appName;
  brandSubtitle.textContent = config.subtitle;
  aboutVersion.textContent = `${config.appName} · Versión ${config.version}`;

  function setActiveTab(key) {
    Object.values(screens).forEach(s => s.classList.add("hidden"));
    Object.values(tabs).forEach(t => t.classList.remove("active"));
    screens[key].classList.remove("hidden");
    tabs[key].classList.add("active");

    if (key === "history") renderHistory();
    if (key !== "scan") stopScannerUI();
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      darkLabel.textContent = "Activado";
    } else {
      document.documentElement.removeAttribute("data-theme");
      darkLabel.textContent = "Desactivado";
    }
    storage.setTheme(theme);
  }

  function renderHistory() {
    const entries = storage.loadEntries();
    count.textContent = entries.length;
    historyList.innerHTML = "";

    if (entries.length === 0) {
      historyList.innerHTML = `<p class="tiny">Aún no hay entradas registradas en este teléfono.</p>`;
      return;
    }

    for (const e of entries) {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <div class="left">
          <div class="title">${ui.escapeHtml(e.name)}</div>
          <div class="meta">🕒 ${ui.fmt(e.ts)}</div>
        </div>
        <div class="badge" style="white-space:nowrap;">${ui.escapeHtml(e.category)}</div>
      `;
      historyList.appendChild(row);
    }
  }

  function openModal(att, state) {
    currentAttendee = att || null;
    mStatusOk.classList.add("hidden");
    mStatusBad.classList.add("hidden");

    if (state === "notfound") {
      mAvatar.src = ui.PLACEHOLDER_AVATAR;
      mName.textContent = "No encontrado";
      mCat.textContent = "—";
      mCode.textContent = "Código no válido";
      mStatusBad.classList.remove("hidden");
      btnRegister.classList.add("hidden");
      btnAlready.classList.add("hidden");
      mMsg.textContent = "Este código no existe en el registro.";
      modalBackdrop.style.display = "flex";
      return;
    }

    mAvatar.src = ui.toDriveDirectUrl(att.photo) || ui.PLACEHOLDER_AVATAR;
    mName.textContent = att.name || "—";
    mCat.textContent = att.category || "—";
    mCode.textContent = att.code || "—";

    const dupGlobal = !!att.checked_in;
    const dupLocal = storage.alreadyLocal(att.code);
    const dup = dupGlobal || dupLocal;

    if (dupGlobal) {
      mStatusOk.classList.remove("hidden");
    }

    btnRegister.classList.toggle("hidden", dup);
    btnAlready.classList.toggle("hidden", !dup);

    if (dupGlobal) {
      mMsg.textContent = "✅ Ya ingresó" + (att.checked_at ? (" · " + att.checked_at) : "");
    } else if (dupLocal) {
      mMsg.textContent = "✅ Ya registrado en este teléfono.";
    } else {
      mMsg.textContent = "";
    }

    modalBackdrop.style.display = "flex";
  }

  function closeModal() {
    modalBackdrop.style.display = "none";
    currentAttendee = null;
  }

  function openDangerModal() {
    const entries = storage.loadEntries();
    const total = entries.length;

    dangerText.textContent =
      total > 0
        ? `Se eliminarán ${total} registro(s) guardados en este teléfono.`
        : "No hay registros guardados en este teléfono.";

    dangerInput.value = "";
    dangerConfirm.disabled = true;
    dangerBackdrop.style.display = "flex";

    setTimeout(() => {
      dangerInput.focus();
    }, 50);
  }

  function closeDangerModal() {
    dangerBackdrop.style.display = "none";
    dangerInput.value = "";
    dangerConfirm.disabled = true;
  }

  function validateDangerInput() {
    dangerConfirm.disabled = dangerInput.value.trim() !== "BORRAR";
  }

  function confirmClearHistory() {
    const entries = storage.loadEntries();

    if (!entries.length) {
      closeDangerModal();
      return;
    }

    storage.clearEntries();
    renderHistory();
    closeDangerModal();
    camStatus.textContent = "Historial local borrado correctamente.";
  }

  function explainCameraError(err) {
    const msg = String(err?.message || err || "");

    if (msg.includes("SECURE_CONTEXT_REQUIRED")) {
      return "❌ La cámara requiere HTTPS o localhost.";
    }
    if (msg.includes("MEDIA_DEVICES_UNAVAILABLE")) {
      return "❌ Este navegador no expone mediaDevices.";
    }
    if (msg.includes("GET_USER_MEDIA_UNAVAILABLE")) {
      return "❌ Este navegador no soporta getUserMedia.";
    }
    if (msg.includes("NO_CAMERAS_FOUND")) {
      return "❌ No se encontró ninguna cámara disponible.";
    }
    if (msg.toLowerCase().includes("notallowed")) {
      return "❌ Permiso de cámara denegado.";
    }
    if (msg.toLowerCase().includes("permission")) {
      return "❌ Permiso de cámara bloqueado.";
    }
    if (msg.toLowerCase().includes("notreadable")) {
      return "❌ La cámara está en uso por otra app.";
    }
    if (msg.toLowerCase().includes("overconstrained")) {
      return "❌ No se pudo usar esa cámara del dispositivo.";
    }

    return `❌ Error de cámara: ${msg || "desconocido"}`;
  }

  async function startScannerUI() {
    scannerActive = true;
    scanIdle.classList.add("hidden");
    scanLive.classList.remove("hidden");
    btnStart.classList.add("hidden");
    btnStop.classList.remove("hidden");
    camStatus.textContent = "Preparando cámara...";

    try {
      await qrScanner.start(handleScan, (msg) => {
        camStatus.textContent = msg;
      });
    } catch (err) {
      camStatus.textContent = explainCameraError(err);
      await stopScannerUI(false);
    }
  }

  async function stopScannerUI(clearMessage = true) {
    scannerActive = false;
    if (clearMessage) {
      camStatus.textContent = "";
    }
    await qrScanner.stop();
    btnStart.classList.remove("hidden");
    btnStop.classList.add("hidden");
    scanLive.classList.add("hidden");
    scanIdle.classList.remove("hidden");
  }

  async function handleScan(code) {
    try {
      const data = await api.lookup(code);

      if (!data || !data.ok || !data.attendee) {
        openModal(null, "notfound");
        return;
      }

      openModal(data.attendee);
    } catch {
      openModal(null, "notfound");
    }
  }

  async function registerCurrent() {
    if (!currentAttendee) return;

    btnRegister.disabled = true;
    mMsg.textContent = "Registrando...";

    try {
      const res = await api.checkin(currentAttendee.code);

      if (res?.ok && res?.status === "duplicate") {
        mStatusOk.classList.remove("hidden");
        mMsg.textContent = "✅ Ya ingresó (duplicado).";
        btnRegister.classList.add("hidden");
        btnAlready.classList.remove("hidden");
        return;
      }

      if (res?.ok) {
        storage.addLocal(currentAttendee);
        mMsg.textContent = "✅ Entrada registrada.";
        btnRegister.classList.add("hidden");
        btnAlready.classList.remove("hidden");
        setTimeout(closeModal, 700);
        return;
      }

      mMsg.textContent = "❌ No se pudo registrar.";
    } catch {
      mMsg.textContent = "❌ Error registrando.";
    } finally {
      btnRegister.disabled = false;
    }
  }

  async function handleManualSearch() {
    const code = manualCode.value.trim();
    if (!code) return;
    await handleScan(code);
  }

  tabs.scan.onclick = () => setActiveTab("scan");
  tabs.history.onclick = () => setActiveTab("history");
  tabs.settings.onclick = () => setActiveTab("settings");

  modalClose.onclick = closeModal;
  modalBackdrop.onclick = (e) => {
    if (e.target === modalBackdrop) closeModal();
  };

  btnAlready.onclick = () => {
    closeModal();
    setActiveTab("history");
  };

  dangerClose.onclick = closeDangerModal;
  dangerCancel.onclick = closeDangerModal;
  dangerBackdrop.onclick = (e) => {
    if (e.target === dangerBackdrop) closeDangerModal();
  };
  dangerInput.addEventListener("input", validateDangerInput);
  dangerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && dangerInput.value.trim() === "BORRAR") {
      e.preventDefault();
      confirmClearHistory();
    }
  });
  dangerConfirm.onclick = confirmClearHistory;

  btnStart.onclick = startScannerUI;
  btnStop.onclick = () => stopScannerUI(true);
  btnRegister.onclick = registerCurrent;
  btnManualSearch.onclick = handleManualSearch;

  manualCode.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleManualSearch();
    }
  });

  btnClear.onclick = () => {
    if (scannerActive) {
      camStatus.textContent = "Detén el escáner antes de borrar el historial.";
      return;
    }
    openDangerModal();
  };

  toggleTheme.onclick = () => {
    const next = storage.getTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
  };

  applyTheme(storage.getTheme());
  setActiveTab("scan");
})();