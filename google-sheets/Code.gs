// You In → Google Sheets. Pega este código en Extensiones → Apps Script de la hoja.
// Añade una fila en la pestaña «Lista» o «Mensajes» por cada envío de la web.
var COLUMNS = {
  lista: ["fecha", "fiesta", "fecha_fiesta", "nombre", "correo", "telefono", "acepta_contacto", "estado", "ventaja"],
  mensajes: ["fecha", "fiesta", "fecha_fiesta", "nombre", "correo", "canal", "mensaje"],
};
var TABS = { lista: "Lista", mensajes: "Mensajes" };
// Clave compartida con la web. Puedes escribirla aquí o en Configuración del proyecto → Propiedades del script (TOKEN).
var TOKEN = "";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);
    var expected = TOKEN || PropertiesService.getScriptProperties().getProperty("TOKEN");
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
