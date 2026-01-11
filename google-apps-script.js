function doGet(e) {
  return ContentService.createTextOutput('Hello! The script is active and accessible via GET.').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    logToSheet(sheet, 'doPost RECEIVED', { postDataLength: e.postData.length, type: e.postData.type });

    const data = JSON.parse(e.postData.contents);

    // SISTEMA INCREMENTAL (nuevo)
    if (data.operation && data.type && data.item) {
      return handleIncrementalOperation_Fixed(sheet, data);
    }

    // LEGACY: Mantener compatibilidad con guardado completo (Bulk Save)
    if (data.tasks) {
      const tasksSheet = sheet.getSheetByName('Tasks');
      if (tasksSheet.getLastRow() > 1) {
        tasksSheet.deleteRows(2, tasksSheet.getLastRow() - 1);
      }
      if (tasksSheet.getLastRow() === 0) {
        tasksSheet.appendRow(['id', 'title', 'description', 'status', 'priority', 'assigneeId', 'startDate', 'dueDate', 'tags', 'assigneeIds', 'clientId', 'completedDate', 'recurrence', 'parentTaskId']);
      }
      data.tasks.forEach(task => {
        // Asegurar que tengamos 14 columnas para coincidir con el esquema nuevo
        tasksSheet.appendRow([
          task.id || '', task.title || '', task.description || '', task.status || 'todo',
          task.priority || 'medium', task.assigneeId || '', task.startDate || '',
          task.dueDate || '', (task.tags || []).join(','), (task.assigneeIds || []).join(','),
          task.clientId || '',
          task.completedDate || '',
          task.recurrence ? JSON.stringify(task.recurrence) : '', // Intentar preservar recurrencia si viene
          task.parentTaskId || ''
        ]);
      });
    }

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
          user.id || '', user.name || '', user.email || '', user.password || '',
          user.role || 'Analyst', user.avatar || ''
        ]);
      });
    }

    if (data.clients) {
      let clientsSheet = sheet.getSheetByName('Clients');
      if (!clientsSheet) {
        clientsSheet = sheet.insertSheet('Clients');
      }
      if (clientsSheet.getLastRow() > 1) {
        clientsSheet.deleteRows(2, clientsSheet.getLastRow() - 1);
      }
      if (clientsSheet.getLastRow() === 0) {
        clientsSheet.appendRow(['id', 'name']);
      }
      data.clients.forEach(client => {
        clientsSheet.appendRow([client.id || '', client.name || '']);
      });
    }

    if (data.tasks || data.users || data.clients) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, _version: 'DEBUG_VERIFIED_LEGACY_SUPPORT', message: 'Legacy bulk save executed' })).setMimeType(ContentService.MimeType.JSON);
    }

    // Si no es incremental ni legacy conocido
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Operación no reconocida' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// SISTEMA INCREMENTAL
function handleIncrementalOperation_Fixed(sheet, data) {
  const { operation, type, item } = data;

  if (type === 'task') {
    return handleTaskOperation_Fixed(sheet, operation, item);
  } else if (type === 'client') {
    return handleClientOperation(sheet, operation, item);
  } else if (type === 'user') {
    return handleUserOperation(sheet, operation, item);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Tipo no reconocido' })).setMimeType(ContentService.MimeType.JSON);
}

function logToSheet(sheet, message, data) {
  try {
    let logsSheet = sheet.getSheetByName('Logs');
    if (!logsSheet) {
      logsSheet = sheet.insertSheet('Logs');
      logsSheet.appendRow(['Timestamp', 'Message', 'Data']);
    }
    logsSheet.appendRow([new Date(), message, stringifySafe(data)]);
  } catch (e) {
    console.error('Error logging to sheet', e);
  }
}

// Helper seguro para stringify
function stringifySafe(obj) {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return 'Error stringify: ' + e.toString();
  }
}

function handleTaskOperation_Fixed(sheet, operation, task) {
  console.log('handleTaskOperation_Fixed START', stringifySafe(task));
  logToSheet(sheet, 'handleTaskOperation_Fixed START', { operation, task });

  let tasksSheet = sheet.getSheetByName('Tasks');
  if (!tasksSheet) {
    tasksSheet = sheet.insertSheet('Tasks');
    tasksSheet.appendRow(['id', 'title', 'description', 'status', 'priority', 'assigneeId', 'startDate', 'dueDate', 'tags', 'assigneeIds', 'clientId', 'completedDate', 'recurrence', 'parentTaskId']);
  }

  // Helper para formatear recurrencia
  const formatRecurrence = (recurrence) => {
    console.log('Formateando recurrencia (FIXED):', stringifySafe(recurrence));
    if (!recurrence) return '';
    return JSON.stringify(recurrence);
  };

  const recurrenceStr = formatRecurrence(task.recurrence);
  console.log('Recurrencia formateada string (FIXED):', recurrenceStr);
  logToSheet(sheet, 'Recurrence String', { recurrenceInput: task.recurrence, result: recurrenceStr });

  if (operation === 'create') {
    // Verificar si ya existe
    const data = tasksSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      // ... (resto del codigo igual)

      if (data[i][0] === task.id) {
        // Ya existe, actualizar
        tasksSheet.getRange(i + 1, 1, 1, 14).setValues([[
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
          task.completedDate || '',
          recurrenceStr,
          task.parentTaskId || ''
        ]]);
        return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // No existe, crear
    console.log('Intentando appendRow con recurrencia:', recurrenceStr);
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
      task.completedDate || '',
      recurrenceStr,
      task.parentTaskId || ''
    ]);
    console.log('appendRow ejecutado');

  } else if (operation === 'update') {
    const data = tasksSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === task.id) {
        tasksSheet.getRange(i + 1, 1, 1, 14).setValues([[
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
          task.completedDate || '',
          recurrenceStr,
          task.parentTaskId || ''
        ]]);
        return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
      }
    }

  } else if (operation === 'delete') {
    const data = tasksSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === task.id) {
        tasksSheet.deleteRow(i + 1);
        return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
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

  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
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

  return ContentService.createTextOutput(JSON.stringify({ success: true, _version: 'DEBUG_VERIFIED', message: 'Row appended successfully' })).setMimeType(ContentService.MimeType.JSON);
}

// ============== GENERACIÓN DE TAREAS RECURRENTES (BACKEND) ==============
function processRecurringTasks() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(600000);
  } catch (e) {
    console.log('No se pudo obtener el bloqueo. Otra instancia podría estar ejecutándose.');
    return;
  }

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const tasksSheet = sheet.getSheetByName('Tasks');
    if (!tasksSheet) {
      console.log('No se encontró la hoja "Tasks".');
      return;
    }

    const allData = tasksSheet.getDataRange().getValues();
    const headers = allData[0];
    const tasks = allData.slice(1).map(row => {
      const task = {};
      headers.forEach((header, i) => {
        task[header] = row[i];
      });
      return task;
    });

    const newGeneratedTasks = [];
    const parentTasks = tasks.filter(t => t.recurrence);

    parentTasks.forEach(task => {
      let recurrence;
      try {
        recurrence = JSON.parse(task.recurrence);
      } catch (e) {
        console.log('Error al parsear la recurrencia para la tarea: ' + task.title);
        return;
      }

      if (recurrence && recurrence.enabled) {
        const startDate = new Date(task.startDate);
        const endDate = new Date(task.dueDate);

        const dayMap = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };

        let currentDate = new Date(startDate);
        let safetyCounter = 0;

        while (currentDate <= endDate && safetyCounter < 366) {
          safetyCounter++;
          const dayOfWeek = currentDate.getDay();

          let shouldCreate = false;

          if (recurrence.frequency === 'weekly') {
            if (recurrence.days && recurrence.days.includes(dayOfWeek)) {
              shouldCreate = true;
            }
            else if (recurrence.daysOfWeek && Array.isArray(recurrence.daysOfWeek)) {
              const targetDays = recurrence.daysOfWeek.map(d => dayMap[d.toLowerCase()]);
              if (targetDays.includes(dayOfWeek)) {
                shouldCreate = true;
              }
            }
          }
          else if (recurrence.frequency === 'daily') {
            shouldCreate = true;
          }
          else if (recurrence.frequency === 'monthly') {
            if (currentDate.getDate() === recurrence.dayOfMonth) {
              shouldCreate = true;
            }
          }

          if (shouldCreate) {
            const dateStr = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');

            const exists = tasks.some(t => t.parentTaskId === task.id && t.dueDate === dateStr) ||
              newGeneratedTasks.some(t => t.parentTaskId === task.id && t.dueDate === dateStr);

            if (!exists) {
              const newId = 't' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9);
              const newTask = [
                newId,
                `${task.title} (${dateStr})`,
                task.description || '',
                'todo',
                task.priority || 'medium',
                task.assigneeId || '',
                dateStr,
                dateStr,
                task.tags || '',
                task.assigneeIds || '',
                task.clientId || '',
                '',
                '',
                task.id
              ];
              newGeneratedTasks.push(newTask);
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    });

    if (newGeneratedTasks.length > 0) {
      tasksSheet.getRange(tasksSheet.getLastRow() + 1, 1, newGeneratedTasks.length, newGeneratedTasks[0].length).setValues(newGeneratedTasks);
      console.log(`Se generaron ${newGeneratedTasks.length} nuevas tareas recurrentes.`);
    } else {
      console.log('No se generaron nuevas tareas recurrentes.');
    }

  } catch (e) {
    console.error('Error durante la ejecución de processRecurringTasks: ' + e.toString());
  } finally {
    lock.releaseLock();
  }
}

function createDailyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processRecurringTasks') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('processRecurringTasks')
    .timeBased()
    .everyDays(1)
    .atHour(1)
    .create();

  console.log('Trigger diario para "processRecurringTasks" creado/actualizado.');
}

// ============== FUNCIÓN DE PRUEBA MANUAL ==============
function testCreateRecurringTask() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const tasksSheet = sheet.getSheetByName('Tasks');
  const rowsBefore = tasksSheet ? tasksSheet.getLastRow() : 0;

  const testPayload = {
    operation: 'create',
    type: 'task',
    item: {
      id: 'test_manual_' + new Date().getTime(),
      title: 'Tarea de Prueba Manual recurrente ' + new Date().toLocaleTimeString(),
      description: 'Creada desde el editor de script',
      status: 'todo',
      priority: 'high',
      assigneeId: 'u1',
      startDate: '2026-01-01',
      dueDate: '2026-01-31',
      tags: ['test'],
      assigneeIds: ['u1'],
      clientId: 'c1',
      completedDate: '',
      recurrence: {
        frequency: 'weekly',
        daysOfWeek: ['monday', 'friday'],
        enabled: true,
        endDate: '2026-06-30'
      },
      parentTaskId: null
    }
  };

  console.log('Iniciando prueba manual...');
  const result = handleIncrementalOperation_Fixed(sheet, testPayload);
  console.log('Resultado operación:', result.getContent());

  const tasksSheetAfter = sheet.getSheetByName('Tasks');
  const rowsAfter = tasksSheetAfter.getLastRow();
  console.log(`Filas antes: ${rowsBefore}, Filas despues: ${rowsAfter}`);

  if (rowsAfter > rowsBefore) {
    const lastRowValues = tasksSheetAfter.getRange(rowsAfter, 1, 1, 14).getValues()[0];
    console.log('Valores insertados en la última fila:');
    console.log('ID:', lastRowValues[0]);
    console.log('Title:', lastRowValues[1]);
    console.log('Recurrence (Col 13):', lastRowValues[12]); // index 12 is column 13

    if (lastRowValues[12] && lastRowValues[12] !== '') {
      console.log('✅ ÉXITO: La columna recurrence TIENE datos.');
    } else {
      console.error('❌ ERROR CRÍTICO: La columna recurrence ESTÁ VACÍA.');
    }
  } else {
    console.error('❌ ERROR: No se insertó ninguna fila.');
  }
}