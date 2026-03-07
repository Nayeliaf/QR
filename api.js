(function () {
  const { apiUrl, useMock } = window.APP_CONFIG;

  function normalizeLookupResponse(data, fallbackCode) {
    if (!data) return { ok: false };

    if (data.attendee) {
      return {
        ok: !!data.ok,
        attendee: {
          code: data.attendee.code || fallbackCode,
          name: data.attendee.name || "",
          category: data.attendee.category || "",
          photo: data.attendee.photo ? String(data.attendee.photo).trim() : "",
          checked_in: !!data.attendee.checked_in,
          checked_at: data.attendee.checked_at || ""
        }
      };
    }

    return {
      ok: !!data.ok,
      attendee: {
        code: data.code || fallbackCode,
        name: data.name || "",
        category: data.category || "",
        photo: data.photo ? String(data.photo).trim() : "",
        checked_in: !!data.checked_in,
        checked_at: data.checked_at || ""
      }
    };
  }

  async function mockLookup(code) {
    const attendee = window.MOCK_ATTENDEES.find(
      item => item.code.toUpperCase() === String(code).trim().toUpperCase()
    );

    if (!attendee) {
      return { ok: false, error: "NOT_FOUND" };
    }

    return {
      ok: true,
      attendee: { ...attendee }
    };
  }

  async function mockCheckin(code) {
    const attendee = window.MOCK_ATTENDEES.find(
      item => item.code.toUpperCase() === String(code).trim().toUpperCase()
    );

    if (!attendee) {
      return { ok: false, error: "NOT_FOUND" };
    }

    if (attendee.checked_in) {
      return {
        ok: true,
        status: "duplicate",
        checked_at: attendee.checked_at
      };
    }

    attendee.checked_in = true;
    attendee.checked_at = new Date().toISOString();

    return {
      ok: true,
      status: "checked_in",
      checked_at: attendee.checked_at
    };
  }

  async function liveLookup(code) {
    const url = `${apiUrl}?action=lookup&code=${encodeURIComponent(code)}`;

    const res = await fetch(url);

    if (!res.ok) {
      return { ok: false, error: "NETWORK_ERROR" };
    }

    const data = await res.json();
    return normalizeLookupResponse(data, code);
  }

  async function liveCheckin(code) {
    const body = new URLSearchParams({
      action: "checkin",
      code
    });

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body
    });

    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch {
      return { ok: false, error: "INVALID_RESPONSE", raw: text };
    }
  }

  window.api = {
    lookup(code) {
      return useMock ? mockLookup(code) : liveLookup(code);
    },
    checkin(code) {
      return useMock ? mockCheckin(code) : liveCheckin(code);
    }
  };
})();