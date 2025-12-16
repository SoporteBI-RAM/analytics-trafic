function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // LOG 1: Ver qué llega
    Logger.log('📥 Datos recibidos: ' + e.postData.contents);
    
    var data = JSON.parse(e.postData.contents);
    Logger.log('📦 Operación: ' + data.operation);
    Logger.log('📦 Tipo: ' + data.type);
    
    // SISTEMA INCREMENTAL (operation + type + item)
    if (data.operation && data.type && data.item) {
      Logger.log('✅ Detectado sistema incremental');
      
      if (data.type === 'task') {
        return manejarTarea(sheet, data.operation, data.item);
      } else if (data.type === 'client') {
        return manejarCliente(sheet, data.operation, data.item);
      } else if (data.type === 'user') {
        return manejarUsuario(sheet, data.operation, data.item);
      }
    }
    
    Logger.log('❌ Operación no reconocida');
    return respuestaJSON({success: false, error: 'Operación no reconocida'});
    
  } catch (error) {
    Logger.log('💥 ERROR: ' + error.toString());
    return respuestaJSON({success: false, error: error.toString()});
  }
}

// ==================== TAREAS ====================
function manejarTarea(sheet, operation, task) {
  Logger.log('🎯 Manejando tarea: ' + operation);
  
  var tasksSheet = sheet.getSheetByName('Tasks');
  
  // Crear hoja si no existe
  if (!tasksSheet) {
    Logger.log('📝 Creando hoja Tasks');
    tasksSheet = sheet.insertSheet('Tasks');
    tasksSheet.appendRow(['id', 'title', 'description', 'status', 'priority', 'assigneeId', 'startDate', 'dueDate', 'tags', 'assigneeIds', 'clientId', 'completedDate']);
  }
  
  if (operation === 'create') {
    Logger.log('➕ Creando tarea: ' + task.id);
    
    // Verificar si ya existe (evitar duplicados)
    var allData = tasksSheet.getDataRange().getValues();
    for (var i = 1; i < allData.length; i++) {
      if (allData[i][0] === task.id) {
        Logger.log('⚠️ Tarea ya existe, actualizando');
        return actualizarTarea(tasksSheet, i + 1, task);
      }
    }
    
    // No existe, crear nueva
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
    
    Logger.log('✅ Tarea creada');
    return respuestaJSON({success: true, message: 'Tarea creada'});
  }
  
  if (operation === 'update') {
    Logger.log('✏️ Actualizando tarea: ' + task.id);
    
    var allData = tasksSheet.getDataRange().getValues();
    for (var i = 1; i < allData.length; i++) {
      if (allData[i][0] === task.id) {
        return actualizarTarea(tasksSheet, i + 1, task);
      }
    }
    
    Logger.log('⚠️ Tarea no encontrada para actualizar');
    return respuestaJSON({success: false, error: 'Tarea no encontrada'});
  }
  
  if (operation === 'delete') {
    Logger.log('🗑️ Eliminando tarea: ' + task.id);
    
    var allData = tasksSheet.getDataRange().getValues();
    for (var i = 1; i < allData.length; i++) {
      if (allData[i][0] === task.id) {
        tasksSheet.deleteRow(i + 1);
        Logger.log('✅ Tarea eliminada');
        return respuestaJSON({success: true, message: 'Tarea eliminada'});
      }
    }
    
    Logger.log('⚠️ Tarea no encontrada para eliminar');
    return respuestaJSON({success: false, error: 'Tarea no encontrada'});
  }
  
  return respuestaJSON({success: false, error: 'Operación de tarea no reconocida'});
}

function actualizarTarea(sheet, fila, task) {
  sheet.getRange(fila, 1, 1, 12).setValues([[
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
  
  Logger.log('✅ Tarea actualizada en fila ' + fila);
  return respuestaJSON({success: true, message: 'Tarea actualizada'});
}

// ==================== CLIENTES ====================
function manejarCliente(sheet, operation, client) {
  Logger.log('🏢 Manejando cliente: ' + operation);
  
  var clientsSheet = sheet.getSheetByName('Clients');
  
  if (!clientsSheet) {
    Logger.log('📝 Creando hoja Clients');
    clientsSheet = sheet.insertSheet('Clients');
    clientsSheet.appendRow(['id', 'name']);
  }
  
  if (operation === 'create') {
    clientsSheet.appendRow([client.id, client.name]);
    Logger.log('✅ Cliente creado');
    return respuestaJSON({success: true});
  }
  
  if (operation === 'update') {
    var data = clientsSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === client.id) {
        clientsSheet.getRange(i + 1, 1, 1, 2).setValues([[client.id, client.name]]);
        Logger.log('✅ Cliente actualizado');
        return respuestaJSON({success: true});
      }
    }
  }
  
  if (operation === 'delete') {
    var data = clientsSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === client.id) {
        clientsSheet.deleteRow(i + 1);
        Logger.log('✅ Cliente eliminado');
        return respuestaJSON({success: true});
      }
    }
  }
  
  return respuestaJSON({success: true});
}

// ==================== USUARIOS ====================
function manejarUsuario(sheet, operation, user) {
  Logger.log('👤 Manejando usuario: ' + operation);
  
  var usersSheet = sheet.getSheetByName('Users');
  
  if (!usersSheet) {
    Logger.log('📝 Creando hoja Users');
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
    Logger.log('✅ Usuario creado');
    return respuestaJSON({success: true});
  }
  
  if (operation === 'update') {
    var data = usersSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === user.id) {
        usersSheet.getRange(i + 1, 1, 1, 6).setValues([[
          user.id,
          user.name,
          user.email,
          user.password || '',
          user.role,
          user.avatar
        ]]);
        Logger.log('✅ Usuario actualizado');
        return respuestaJSON({success: true});
      }
    }
  }
  
  if (operation === 'delete') {
    var data = usersSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === user.id) {
        usersSheet.deleteRow(i + 1);
        Logger.log('✅ Usuario eliminado');
        return respuestaJSON({success: true});
      }
    }
  }
  
  return respuestaJSON({success: true});
}

// ==================== UTILIDADES ====================
function respuestaJSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== TEST ====================
function testCrearTarea() {
  var testData = {
    operation: 'create',
    type: 'task',
    item: {
      id: 'test-' + new Date().getTime(),
      title: 'Tarea de Prueba',
      description: 'Descripción de prueba',
      status: 'todo',
      priority: 'medium',
      assigneeId: 'u1',
      startDate: '2025-12-17',
      dueDate: '2025-12-20',
      tags: ['test'],
      assigneeIds: ['u1'],
      clientId: 'c1',
      completedDate: ''
    }
  };
  
  var mockRequest = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  var result = doPost(mockRequest);
  Logger.log('Resultado: ' + result.getContent());
}
