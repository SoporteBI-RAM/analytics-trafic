function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const data = JSON.parse(e.postData.contents);
    
    // SISTEMA INCREMENTAL (nuevo)
    if (data.operation && data.type && data.item) {
      return handleIncrementalOperation(sheet, data);
    }
    
    // LEGACY: Operaciones antiguas (add_task, update_task, delete_task)
    if (data.operation === 'add_task') {
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
      
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.operation === 'update_task') {
      const tasksSheet = sheet.getSheetByName('Tasks');
      if (!tasksSheet) throw new Error('Hoja Tasks no encontrada');
      
      const task = data.task;
      const allData = tasksSheet.getDataRange().getValues();
      
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === task.id) {
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
          
          return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({success: false})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.operation === 'delete_task') {
      const tasksSheet = sheet.getSheetByName('Tasks');
      if (!tasksSheet) throw new Error('Hoja Tasks no encontrada');
      
      const taskId = data.taskId;
      const allData = tasksSheet.getDataRange().getValues();
      
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === taskId) {
          tasksSheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({success: false})).setMimeType(ContentService.MimeType.JSON);
    }
    
    // LEGACY: Guardado masivo (NO USAR - causa duplicados)
    if (data.tasks) {
      const tasksSheet = sheet.getSheetByName('Tasks') || sheet.insertSheet('Tasks');
      tasksSheet.clear();
      tasksSheet.appendRow(['id', 'title', 'description', 'status', 'priority', 'assigneeId', 'startDate', 'dueDate', 'tags', 'assigneeIds', 'clientId', 'completedDate']);
      
      data.tasks.forEach(task => {
        tasksSheet.appendRow([
          task.id,
          task.title,
          task.description,
          task.status,
          task.priority,
          task.assigneeId || '',
          task.startDate,
          task.dueDate,
          (task.tags || []).join(','),
          (task.assigneeIds || []).join(','),
          task.clientId || '',
          task.completedDate || ''
        ]);
      });
      
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Operación no reconocida'})).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

// SISTEMA INCREMENTAL
function handleIncrementalOperation(sheet, data) {
  const { operation, type, item } = data;
  
  if (type === 'task') {
    return handleTaskOperation(sheet, operation, item);
  } else if (type === 'client') {
    return handleClientOperation(sheet, operation, item);
  } else if (type === 'user') {
    return handleUserOperation(sheet, operation, item);
  }
  
  return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Tipo no reconocido'})).setMimeType(ContentService.MimeType.JSON);
}

function handleTaskOperation(sheet, operation, task) {
  let tasksSheet = sheet.getSheetByName('Tasks');
  if (!tasksSheet) {
    tasksSheet = sheet.insertSheet('Tasks');
    tasksSheet.appendRow(['id', 'title', 'description', 'status', 'priority', 'assigneeId', 'startDate', 'dueDate', 'tags', 'assigneeIds', 'clientId', 'completedDate']);
  }
  
  if (operation === 'create') {
    // Verificar si ya existe
    const data = tasksSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === task.id) {
        // Ya existe, actualizar en vez de crear
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
        return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // No existe, crear
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
    
  } else if (operation === 'update') {
    const data = tasksSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === task.id) {
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
        return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
  } else if (operation === 'delete') {
    const data = tasksSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === task.id) {
        tasksSheet.deleteRow(i + 1);
        return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
}

function handleClientOperation(sheet, operation, client) {
  let clientsSheet = sheet.getSheetByName('Clients');
  if (!clientsSheet) {
    clientsSheet = sheet.insertSheet('Clients');
    clientsSheet.appendRow(['id', 'name']);
  }
  
  if (operation === 'create') {
    clientsSheet.appendRow([client.id, client.name]);
  } else if (operation === 'update') {
    const data = clientsSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === client.id) {
        clientsSheet.getRange(i + 1, 1, 1, 2).setValues([[client.id, client.name]]);
        break;
      }
    }
  } else if (operation === 'delete') {
    const data = clientsSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === client.id) {
        clientsSheet.deleteRow(i + 1);
        break;
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
}

function handleUserOperation(sheet, operation, user) {
  let usersSheet = sheet.getSheetByName('Users');
  if (!usersSheet) {
    usersSheet = sheet.insertSheet('Users');
    usersSheet.appendRow(['id', 'name', 'email', 'password', 'role', 'avatar']);
  }
  
  if (operation === 'create') {
    usersSheet.appendRow([
      user.id,
      user.name,
      user.email,
      user.password || '',
      user.role,
      user.avatar
    ]);
  } else if (operation === 'update') {
    const data = usersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === user.id) {
        usersSheet.getRange(i + 1, 1, 1, 6).setValues([[
          user.id,
          user.name,
          user.email,
          user.password || '',
          user.role,
          user.avatar
        ]]);
        break;
      }
    }
  } else if (operation === 'delete') {
    const data = usersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === user.id) {
        usersSheet.deleteRow(i + 1);
        break;
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
}
