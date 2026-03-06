(function () {
  let html5Qr = null;
  let scanning = false;
  let scanLock = false;
  let lastScan = "";
  let lastScanAt = 0;

  async function getBestCameraId() {
    const devices = await Html5Qrcode.getCameras();

    if (!devices || !devices.length) {
      throw new Error("No se encontraron cámaras.");
    }

    const backCam =
      devices.find(d => /back|rear|environment|trasera/i.test(d.label)) ||
      devices[devices.length - 1];

    return backCam.id;
  }

  async function start(onDetected, onStatus) {
    if (scanning) return;
    scanning = true;

    try {
      html5Qr = new Html5Qrcode("reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      });
    } catch {
      html5Qr = new Html5Qrcode("reader");
    }

    try {
      onStatus("Solicitando acceso a la cámara...");

      const cameraId = await getBestCameraId();

      onStatus("Cámara lista ✔ Escaneando...");

      await html5Qr.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.333333
        },
        async (decodedText) => {
          const now = Date.now();
          const code = String(decodedText).trim();

          if (code === lastScan && (now - lastScanAt) < 1500) return;
          if (scanLock) return;

          lastScan = code;
          lastScanAt = now;
          scanLock = true;

          try {
            await onDetected(code);
          } finally {
            setTimeout(() => {
              scanLock = false;
            }, 900);
          }
        },
        () => {}
      );
    } catch (err) {
      scanning = false;
      onStatus("❌ No se pudo abrir la cámara");
      throw err;
    }
  }

  async function stop() {
    scanning = false;

    try {
      if (html5Qr) {
        await html5Qr.stop();
        await html5Qr.clear();
      }
    } catch {}

    html5Qr = null;
  }

  window.qrScanner = { start, stop };
})();