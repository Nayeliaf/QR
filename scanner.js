(function () {
  let html5Qr = null;
  let scanning = false;
  let scanLock = false;
  let lastScan = "";
  let lastScanAt = 0;

  async function probeCameraAccess(onStatus) {
    if (!window.isSecureContext) {
      throw new Error("SECURE_CONTEXT_REQUIRED");
    }

    if (!navigator.mediaDevices) {
      throw new Error("MEDIA_DEVICES_UNAVAILABLE");
    }

    if (!navigator.mediaDevices.getUserMedia) {
      throw new Error("GET_USER_MEDIA_UNAVAILABLE");
    }

    onStatus("Solicitando permiso de cámara...");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());

    onStatus("Permiso concedido. Buscando cámara...");
  }

  async function getBestCameraId() {
    const devices = await Html5Qrcode.getCameras();

    if (!devices || !devices.length) {
      throw new Error("NO_CAMERAS_FOUND");
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
      await probeCameraAccess(onStatus);

      try {
        html5Qr = new Html5Qrcode("reader", {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        });
      } catch {
        html5Qr = new Html5Qrcode("reader");
      }

      const cameraId = await getBestCameraId();

      onStatus("Cámara lista ✔ Escaneando...");

      await html5Qr.start(
        cameraId,
        {
          fps: 10,
          aspectRatio: 1,
          qrbox: function (viewfinderWidth, viewfinderHeight) {
            const edge = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
            return {
              width: edge,
              height: edge
            };
          }
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