function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const data = JSON.parse(e.postData.contents);
    
    // Detectar qué tipo de operación es
    if (data.operation === 'add_task') {
      // AGREGAR UNA TAREA (no sobrescribir)
      const tasksSheet = sheet.getSheetByName('Tasks');
      if (!tasksSheet) throw new Error('Hoja Tasks no encontrada');
      
      const task = data.task;
      tasksSheet.appendRow([
        task.id || '',
        task.title || '',
        task.description || '',
        task.status || 'todo',
        task.priority || 'medium',
        task.assigneeId || '',
        task.startDate || '',
        task.dueDate || '',
        (task.tags || []).join(','),
        (task.assigneeIds || []).join(','),
        task.clientId || '',
        task.completedDate || ''
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({success: true, message: 'Tarea agregada'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.operation === 'update_task') {
      // ACTUALIZAR UNA TAREA ESPECÍFICA
      const tasksSheet = sheet.getSheetByName('Tasks');
      if (!tasksSheet) throw new Error('Hoja Tasks no encontrada');
      
      const task = data.task;
      const allData = tasksSheet.getDataRange().getValues();
      
      // Buscar la tarea por ID
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === task.id) {
          // Actualizar la fila (12 columnas A-L)
          tasksSheet.getRange(i + 1, 1, 1, 12).setValues([[
            task.id,
            task.title || '',
            task.description || '',
            task.status || 'todo',
            task.priority || 'medium',
            task.assigneeId || '',
            task.startDate || '',
            task.dueDate || '',
            (task.tags || []).join(','),
            (task.assigneeIds || []).join(','),
            task.clientId || '',
            task.completedDate || ''
          ]]);
          
          return ContentService.createTextOutput(JSON.stringify({success: true, message: 'Tarea actualizada'})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Tarea no encontrada'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.operation === 'delete_task') {
      // ELIMINAR UNA TAREA ESPECÍFICA
      const tasksSheet = sheet.getSheetByName('Tasks');
      if (!tasksSheet) throw new Error('Hoja Tasks no encontrada');
      
      const taskId = data.taskId;
      const allData = tasksSheet.getDataRange().getValues();
      
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === taskId) {
          tasksSheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({success: true, message: 'Tarea eliminada'})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Tarea no encontrada'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.operation === 'add_client') {
      // AGREGAR UN CLIENTE
      let clientsSheet = sheet.getSheetByName('Clients');
      if (!clientsSheet) {
        clientsSheet = sheet.insertSheet('Clients');
        clientsSheet.appendRow(['id', 'name']);
      }
      
      const client = data.client;
      clientsSheet.appendRow([
        client.id || '',
        client.name || ''
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({success: true, message: 'Cliente agregado'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.operation === 'update_client') {
      // ACTUALIZAR UN CLIENTE
      const clientsSheet = sheet.getSheetByName('Clients');
      if (!clientsSheet) throw new Error('Hoja Clients no encontrada');
      
      const client = data.client;
      const allData = clientsSheet.getDataRange().getValues();
      
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === client.id) {
          clientsSheet.getRange(i + 1, 1, 1, 2).setValues([[client.id, client.name]]);
          return ContentService.createTextOutput(JSON.stringify({success: true, message: 'Cliente actualizado'})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Cliente no encontrado'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.operation === 'delete_client') {
      // ELIMINAR UN CLIENTE
      const clientsSheet = sheet.getSheetByName('Clients');
      if (!clientsSheet) throw new Error('Hoja Clients no encontrada');
      
      const clientId = data.clientId;
      const allData = clientsSheet.getDataRange().getValues();
      
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === clientId) {
          clientsSheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({success: true, message: 'Cliente eliminado'})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Cliente no encontrado'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    // OPERACIÓN DE REEMPLAZO TOTAL (solo para usuarios)
    if (data.users) {
      const usersSheet = sheet.getSheetByName('Users');
      if (usersSheet.getLastRow() > 1) {
        usersSheet.deleteRows(2, usersSheet.getLastRow() - 1);
      }
      if (usersSheet.getLastRow() === 0) {
        usersSheet.appendRow(['id', 'name', 'email', 'password', 'role', 'avatar']);
      }
      data.users.forEach(user => {
        usersSheet.appendRow([
          user.id || '',
          user.name || '',
          user.email || '',
          user.password || '',
          user.role || 'Analyst',
          user.avatar || ''
        ]);
      });
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Operación no reconocida'})).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({status: 'Apps Script activo - v2.0'})).setMimeType(ContentService.MimeType.JSON);
}
