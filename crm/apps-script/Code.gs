/**
 * BIMTECH Online CRM — Google Apps Script backend
 * Spreadsheet: BIMTECH Online CRM
 *
 * First run: run setupCrm() from the Apps Script editor and approve access.
 * Deploy only after testing. Keep the spreadsheet private.
 */

const CRM_CONFIG = {
  SPREADSHEET_ID: "1YqyzL2HowfPYzu0qOde68zrwxO660eVWWHsLxmoFdx8",
  ALLOWED_EMAIL: "info@bimtechonline.in",
  SHEETS: {
    Leads: [
      "Lead ID", "Created At", "Updated At", "Full Name", "Mobile",
      "Email", "Programme", "Source", "Stage", "Next Follow-up",
      "Last Contacted", "Assigned To", "Consent", "Notes"
    ],
    Activities: [
      "Activity ID", "Lead ID", "Date", "Type", "Summary",
      "Next Follow-up", "Created By"
    ],
    Settings: ["Key", "Value"]
  },
  STAGES: [
    "New", "Contacted", "Interested", "Follow-up",
    "Applied", "Enrolled", "Not Interested", "Lost"
  ]
};

/**
 * Run manually once from the Apps Script editor.
 * Creates the CRM tabs and headers without deleting existing data.
 */
function setupCrm() {
  assertAllowedUser_();
  const ss = SpreadsheetApp.openById(CRM_CONFIG.SPREADSHEET_ID);

  Object.keys(CRM_CONFIG.SHEETS).forEach(function(name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);

    const headers = CRM_CONFIG.SHEETS[name];
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }
  });

  const settings = ss.getSheetByName("Settings");
  if (settings.getLastRow() <= 1) {
    const rows = [
      ["Allowed Email", CRM_CONFIG.ALLOWED_EMAIL],
      ["Default Stage", "New"],
      ["Stages", CRM_CONFIG.STAGES.join(", ")]
    ];
    settings.getRange(2, 1, rows.length, 2).setValues(rows);
  }

  return "CRM database tabs are ready.";
}

/** Basic backend health check. */
function doGet() {
  return jsonOutput_({
    ok: true,
    service: "BIMTECH Online CRM",
    message: "Backend is running. Use the authorised CRM interface."
  });
}

/**
 * API entry point. Deployment access must be restricted to the owner account.
 * Supported actions: listLeads, addLead, updateLead, addActivity.
 */
function doPost(e) {
  try {
    assertAllowedUser_();
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = String(payload.action || "");

    let result;
    if (action === "listLeads") result = listLeads_();
    else if (action === "addLead") result = addLead_(payload.lead || {});
    else if (action === "updateLead") result = updateLead_(payload.lead || {});
    else if (action === "addActivity") result = addActivity_(payload.activity || {});
    else throw new Error("Unsupported action.");

    return jsonOutput_({ ok: true, data: result });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err.message || err) });
  }
}

function listLeads_() {
  const sheet = getSheet_("Leads");
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(function(row) {
    return row[0];
  }).map(function(row) {
    const item = {};
    headers.forEach(function(header, index) {
      item[header] = row[index] instanceof Date
        ? row[index].toISOString()
        : row[index];
    });
    return item;
  });
}

function addLead_(lead) {
  const name = clean_(lead.fullName, 120);
  const mobile = clean_(lead.mobile, 20).replace(/\s+/g, "");
  if (!name) throw new Error("Full name is required.");
  if (!/^\+?[0-9]{10,15}$/.test(mobile)) {
    throw new Error("Enter a valid mobile number.");
  }

  const sheet = getSheet_("Leads");
  const rows = sheet.getDataRange().getValues();
  const duplicate = rows.slice(1).some(function(row) {
    return String(row[4]).replace(/\s+/g, "") === mobile;
  });
  if (duplicate) throw new Error("A lead with this mobile number already exists.");

  const now = new Date();
  const leadId = "BIM-" + Utilities.getUuid().slice(0, 8).toUpperCase();
  const record = [
    leadId, now, now, name, mobile,
    clean_(lead.email, 150), clean_(lead.programme, 120),
    clean_(lead.source || "CRM", 80), "New", "",
    "", "", lead.consent === true ? "Yes" : "Not recorded",
    clean_(lead.notes, 1000)
  ];

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet.appendRow(record);
  } finally {
    lock.releaseLock();
  }
  return { leadId: leadId, fullName: name, mobile: mobile, stage: "New" };
}

function updateLead_(lead) {
  const leadId = clean_(lead.leadId, 40);
  if (!leadId) throw new Error("Lead ID is required.");
  const sheet = getSheet_("Leads");
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf("Lead ID");
  const rowIndex = values.findIndex(function(row, index) {
    return index > 0 && String(row[idCol]) === leadId;
  });
  if (rowIndex < 1) throw new Error("Lead not found.");

  const allowed = {
    "Full Name": clean_(lead.fullName, 120),
    "Mobile": clean_(lead.mobile, 20),
    "Email": clean_(lead.email, 150),
    "Programme": clean_(lead.programme, 120),
    "Stage": clean_(lead.stage, 40),
    "Next Follow-up": clean_(lead.nextFollowUp, 40),
    "Notes": clean_(lead.notes, 1000)
  };
  Object.keys(allowed).forEach(function(header) {
    if (lead[header] !== undefined || (
      header === "Full Name" && lead.fullName !== undefined
    )) {
      const col = headers.indexOf(header);
      if (col >= 0) sheet.getRange(rowIndex + 1, col + 1).setValue(allowed[header]);
    }
  });
  sheet.getRange(rowIndex + 1, headers.indexOf("Updated At") + 1).setValue(new Date());
  return { leadId: leadId, updated: true };
}

function addActivity_(activity) {
  const leadId = clean_(activity.leadId, 40);
  const type = clean_(activity.type, 40);
  const summary = clean_(activity.summary, 1000);
  if (!leadId || !type || !summary) {
    throw new Error("Lead ID, activity type and summary are required.");
  }
  const sheet = getSheet_("Activities");
  const activityId = "ACT-" + Utilities.getUuid().slice(0, 8).toUpperCase();
  sheet.appendRow([
    activityId, leadId, new Date(), type, summary,
    clean_(activity.nextFollowUp, 40), CRM_CONFIG.ALLOWED_EMAIL
  ]);
  return { activityId: activityId };
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.openById(CRM_CONFIG.SPREADSHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error("CRM database is not initialised. Run setupCrm() first.");
  return sheet;
}

function assertAllowedUser_() {
  const email = Session.getEffectiveUser().getEmail();
  if (email && email.toLowerCase() !== CRM_CONFIG.ALLOWED_EMAIL) {
    throw new Error("This account is not authorised to access the CRM.");
  }
}

function clean_(value, maxLength) {
  return String(value == null ? "" : value).trim().slice(0, maxLength);
}

function jsonOutput_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
