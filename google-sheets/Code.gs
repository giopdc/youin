/**
 * You In → Google Sheets
 * Pega este código en Extensiones → Apps Script de tu hoja y sigue los pasos del README (sección Google Sheets).
 * Crea (si no existen) dos pestañas: «Lista» y «Mensajes», y añade una fila por cada envío.
 */
var COLUMNS = {
  lista: ["fecha", "fiesta", "fecha_fiesta", "nombre", "correo", "telefono", "acepta_contacto", "estado", "ventaja"],
  mensajes: ["fecha", "fiesta", "fecha_fiesta", "nombre", "correo", "canal", "mensaje"],
};
var TABS = { lista: "Lista", mensajes: "Mensajes" };

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);
    var expected = PropertiesService.getScriptProperties().getProperty("TOKEN");
    if (!expected || data.token !== expected) return reply({ ok: false, error: "token" });
    var cols = COLUMNS[data.kind];
    if (!cols) return reply({ ok: false, error: "kind" });
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(TABS[data.kind]) || ss.insertSheet(TABS[data.kind]);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(cols);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, cols.length).setFontWeight("bold");
    }
    sheet.appendRow(cols.map(function (c) {
      var v = data.row[c];
      if (v === true) return "sí";
      if (v === false) return "no";
      v = v == null ? "" : String(v);
      return /^[=+\-@]/.test(v) ? "'" + v : v; // evita fórmulas
    }));
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
