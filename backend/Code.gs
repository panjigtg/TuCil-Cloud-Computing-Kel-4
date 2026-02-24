// ==========================================
// CONFIGURATION & SETUP
// ==========================================

const SPREADSHEET_ID = "15_0lTfXBo03YmQ_dbDQi42uFfsgxm08ANL3J79rYgtE"; // Leave empty if bound to a spreadsheet, otherwise set ID
const TTL_SECONDS = 120; // Token valid for 120 seconds

function getDb() {
  return SPREADSHEET_ID ? 
    SpreadsheetApp.openById(SPREADSHEET_ID) : 
    SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(sheetName) {
  const db = getDb();
  if(!db) throw new Error("Spreadsheet not found");
  const sheet = db.getSheetByName(sheetName);
  if(!sheet) throw new Error(`Sheet ${sheetName} not found`);
  return sheet;
}

// ==========================================
// UTILITIES
// ==========================================

function sendSuccess(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendError(error, statusCode) {
  // statusCode parameter is kept for signature consistency but ContentService
  // always returns 200 in Apps Script for web apps. The client should check `ok`.
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: error }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// ROUTERS
// ==========================================

function doGet(e) {
  try {
    const path = (e.parameter && e.parameter.path) ? e.parameter.path : "ui";

    if (path === "presence/status") {
      return handleGetStatus(e);
    } else if (path === "sensor/gps/marker") {
      return handleGetGpsMarker(e);
    } else if (path === "sensor/gps/polyline") {
      return handleGetGpsPolyline(e);
    } else if (path === "ui") {
      return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('Dashboard Presensi QR')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }

    return sendError("Route not found");
  } catch (error) {
    return sendError(error.message || String(error));
  }
}

function doPost(e) {
  try {
    const path = (e.parameter && e.parameter.path) ? e.parameter.path : "";
    let payload = {};
    
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    if (path === "presence/qr/generate") {
      return handleGenerateQR(payload);
    } else if (path === "presence/checkin") {
      return handleCheckin(payload);
    } else if (path === "sensor/accel/batch") {
      return handleAccelBatch(payload);
    } else if (path === "sensor/gps") {
      return handlePostGps(payload);
    }

    return sendError("Route not found");
  } catch (error) {
    return sendError(error.message || String(error));
  }
}

// ==========================================
// PRESENCE MODULE
// ==========================================

function handleGenerateQR(payload) {
  const { course_id, session_id, ts } = payload;
  if (!course_id || !session_id) return sendError("Missing required parameters: course_id, session_id");

  const token = "TKN-" + Utilities.getUuid().substring(0,6).toUpperCase();
  const now = new Date();
  const expires = new Date(now.getTime() + (TTL_SECONDS * 1000));
  
  const sheet = getSheet('tokens');
  // qr_token, course_id, session_id, created_at, expires_at, used
  sheet.appendRow([
    token,
    course_id,
    session_id,
    now.toISOString(),
    expires.toISOString(),
    false
  ]);

  return sendSuccess({ qr_token: token, expires_at: expires.toISOString() });
}

function processGenerateQR(payload) {
  // Bridge for frontend HTML to bypass HTTP routing overhead
  try {
    const { course_id, session_id, ts } = payload;
    if (!course_id || !session_id) return { ok: false, error: "Missing required parameters" };

    const token = "TKN-" + Utilities.getUuid().substring(0,6).toUpperCase();
    const now = new Date();
    const expires = new Date(now.getTime() + (TTL_SECONDS * 1000));
    
    const sheet = getSheet('tokens');
    sheet.appendRow([
      token,
      course_id,
      session_id,
      now.toISOString(),
      expires.toISOString(),
      false
    ]);

    return { ok: true, data: { qr_token: token, expires_at: expires.toISOString() } };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

function handleCheckin(payload) {
  const { user_id, device_id, course_id, session_id, qr_token, ts } = payload;
  if (!user_id || !qr_token) return sendError("Missing required parameters");

  const tokensSheet = getSheet('tokens');
  const data = tokensSheet.getDataRange().getValues(); // [qr_token, course_id, session_id, created_at, expires_at, used]
  
  let tokenRowIdx = -1;
  let tokenData = null;

  // start from 1 to skip header
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === qr_token && data[i][1] === course_id && data[i][2] === session_id) {
      tokenRowIdx = i;
      tokenData = data[i];
      break;
    }
  }

  if (tokenRowIdx === -1) return sendError("token_invalid");
  
  if (tokenData[5] === true) return sendError("token_already_used");
  
  const now = new Date();
  const expiresAt = new Date(tokenData[4]);
  if (now > expiresAt) return sendError("token_expired");

  // Mark token as used
  // tokenRowIdx + 1 (because getRange is 1-indexed), column 6 for 'used'
  tokensSheet.getRange(tokenRowIdx + 1, 6).setValue(true);

  // Save to presence sheet
  const presenceSheet = getSheet('presence');
  const presence_id = "PR-" + Utilities.getUuid().substring(0, 8).toUpperCase();
  // presence_id, user_id, device_id, course_id, session_id, qr_token, ts, recorded_at
  presenceSheet.appendRow([
    presence_id,
    user_id,
    device_id || "",
    course_id,
    session_id,
    qr_token,
    ts || now.toISOString(),
    now.toISOString()
  ]);

  return sendSuccess({ presence_id: presence_id, status: "checked_in" });
}

function handleGetStatus(e) {
  const p = e.parameter;
  const { user_id, course_id, session_id } = p;
  
  if (!user_id || !course_id || !session_id) return sendError("Missing parameters");

  const presSheet = getSheet('presence');
  const data = presSheet.getDataRange().getValues();
  
  let checkedIn = false;
  let lastTs = null;

  // Look backwards for the most recent
  for (let i = data.length - 1; i >= 1; i--) {
    // presence_id(0), user_id(1), device_id(2), course_id(3), session_id(4), qr_token(5), ts(6), recorded_at(7)
    if (data[i][1] === user_id && data[i][3] === course_id && data[i][4] === session_id) {
      checkedIn = true;
      lastTs = data[i][6];
      break;
    }
  }

  if (checkedIn) {
    return sendSuccess({
      user_id, course_id, session_id, status: "checked_in", last_ts: lastTs
    });
  } else {
    return sendSuccess({
      user_id, course_id, session_id, status: "not_checked_in", last_ts: null
    });
  }
}

// ==========================================
// SENSOR MODULE
// ==========================================

function handleAccelBatch(payload) {
  const { device_id, ts, data } = payload;
  if (!device_id || !data || !Array.isArray(data)) return sendError("Invalid payload");

  const sheet = getSheet('accel');
  const nowISO = new Date().toISOString();
  
  const rows = [];
  data.forEach(item => {
    // device_id, x, y, z, sample_ts, batch_ts, recorded_at
    rows.push([
      device_id,
      item.x,
      item.y,
      item.z,
      item.ts,
      ts,
      nowISO
    ]);
  });

  if (rows.length > 0) {
    const lastRow = sheet.getLastRow();
    // Use batch write to avoid quota issues or slow execution
    sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  return sendSuccess({ processed_records: rows.length });
}

function handlePostGps(payload) {
  const { device_id, lat, lng, accuracy, altitude, ts } = payload;
  if (!device_id || lat === undefined || lng === undefined) return sendError("Missing required parameters");

  const sheet = getSheet('gps');
  // device_id, lat, lng, accuracy, altitude, ts, recorded_at
  const now = new Date().toISOString();
  sheet.appendRow([
    device_id,
    lat,
    lng,
    accuracy || 0,
    altitude || 0,
    ts || now,
    now
  ]);

  return sendSuccess({ status: "recorded", ts: ts || now });
}

function handleGetGpsMarker(e) {
  const { device_id } = e.parameter;
  if (!device_id) return sendError("Missing device_id");

  const sheet = getSheet('gps');
  const data = sheet.getDataRange().getValues();

  let marker = null;
  // search backwards for the latest
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === device_id) { // column 0 is device_id
      marker = {
        lat: data[i][1],
        lng: data[i][2],
        accuracy: data[i][3],
        altitude: data[i][4],
        ts: data[i][5]
      };
      break;
    }
  }

  if (marker) {
    return sendSuccess(marker);
  } else {
    return sendError("No location found");
  }
}

function handleGetGpsPolyline(e) {
  const { device_id, from, to } = e.parameter;
  if (!device_id || !from || !to) return sendError("Missing required parameters: device_id, from, to");

  const sheet = getSheet('gps');
  const data = sheet.getDataRange().getValues();
  
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const path = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === device_id) {
      const recordDate = new Date(data[i][5]); // ts
      if (recordDate >= fromDate && recordDate <= toDate) {
        path.push({
          lat: data[i][1],
          lng: data[i][2],
          ts: data[i][5]
        });
      }
    }
  }

  return sendSuccess({ points: path });
}
