function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === 'getProducts') {
    const sheet = ss.getSheetByName('Productos') || ss.insertSheet('Productos');
    if (sheet.getLastRow() < 1) { // If sheet is empty
        return ContentService.createTextOutput(JSON.stringify({success:true, data:[]})).setMimeType(ContentService.MimeType.JSON);
    }
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const products = data.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      // Ensure price is a number
      obj.price = Number(obj.price) || 0;
      return obj;
    });
    return ContentService
      .createTextOutput(JSON.stringify({success:true, data:products}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getCategories') {
    const sheet = ss.getSheetByName('Categorias') || ss.insertSheet('Categorias');
    if (sheet.getLastRow() < 1) { // If sheet is empty
        return ContentService.createTextOutput(JSON.stringify({success:true, data:[]})).setMimeType(ContentService.MimeType.JSON);
    }
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const cats = data.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    return ContentService
      .createTextOutput(JSON.stringify({success:true, data:cats}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getConfig') {
    const sheet = ss.getSheetByName('Config') || ss.insertSheet('Config');
    if (sheet.getLastRow() < 1) { // If sheet is empty
        const defaultConfig = {"whatsapp":"573001234567","name":"BeautyLau","pass":"admin123","scriptUrl":""};
        return ContentService.createTextOutput(JSON.stringify({success:true, data:defaultConfig})).setMimeType(ContentService.MimeType.JSON);
    }
    const data = sheet.getDataRange().getValues();
    const config = data.reduce((obj, row) => {
      if(row[0]) obj[row[0]] = row[1];
      return obj;
    }, {});
    return ContentService
      .createTextOutput(JSON.stringify({success:true, data:config}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({error:'Acción no válida'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({error:'Invalid JSON body', details: e.postData.contents}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const action = body.action;

  if (action === 'saveProducts') {
    let sheet = ss.getSheetByName('Productos') || ss.insertSheet('Productos');
    sheet.clearContents();
    const headers = ['id','name','price','category','description','image','badge'];
    sheet.appendRow(headers);
    if (body.products && Array.isArray(body.products)) {
        body.products.forEach(p => {
          sheet.appendRow([p.id||'',p.name||'',p.price||0,p.category||'',p.description||'',p.image||'',p.badge||'']);
        });
    }
    return ContentService
      .createTextOutput(JSON.stringify({success:true, message: 'Products saved'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'saveCategories') {
    let sheet = ss.getSheetByName('Categorias') || ss.insertSheet('Categorias');
    sheet.clearContents();
    const headers = ['id','name','emoji'];
    sheet.appendRow(headers);
    if (body.categories && Array.isArray(body.categories)) {
        body.categories.forEach(c => {
          sheet.appendRow([c.id||'',c.name||'',c.emoji||'']);
        });
    }
    return ContentService
      .createTextOutput(JSON.stringify({success:true, message: 'Categories saved'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'saveConfig') {
    let sheet = ss.getSheetByName('Config') || ss.insertSheet('Config');
    sheet.clearContents();
    const configData = body.config;
    if (configData) {
        Object.keys(configData).forEach(key => {
            sheet.appendRow([key, configData[key]]);
        });
    }
    return ContentService
      .createTextOutput(JSON.stringify({success:true, message: 'Config saved'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({error:'Acción no válida en POST'}))
    .setMimeType(ContentService.MimeType.JSON);
}