function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const data = JSON.parse(e.postData.contents);

    // NUEVO: Manejar operación específica (create, update, delete)
    if (data.operation) {
      return handleIncrementalOperation(sheet, data);
    }

    // LEGACY: Mantener compatibilidad con guardado completo
    if (data.tasks) {
      const tasksSheet = sheet.getSheetByName('Tasks');
      if (tasksSheet.getLastRow() > 1) {
        tasksSheet.deleteRows(2, tasksSheet.getLastRow() - 1);
      }
      if (tasksSheet.getLastRow() === 0) {
        tasksSheet.appendRow(['id', 'title', 'description', 'status', 'priority', 'assigneeId', 'startDate', 'dueDate', 'tags', 'assigneeIds', 'clientId']);
      }
      data.tasks.forEach(task => {
        tasksSheet.appendRow([
          task.id || '', task.title || '', task.description || '', task.status || 'todo',
          task.priority || 'medium', task.assigneeId || '', task.startDate || '',
          task.dueDate || '', (task.tags || []).join(','), (task.assigneeIds || []).join(','),
          task.clientId || ''
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

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// NUEVA FUNCIÓN: Operaciones incrementales
function handleIncrementalOperation(sheet, data) {
  const { operation, type, item } = data;

  if (type === 'task') {
    return handleTaskOperation(sheet, operation, item);
  } else if (type === 'client') {
    return handleClientOperation(sheet, operation, item);
  } else if (type === 'user') {
    return handleUserOperation(sheet, operation, item);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: 'Unknown type' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleTaskOperation(sheet, operation, task) {
  const tasksSheet = sheet.getSheetByName('Tasks');

  if (operation === 'create') {
    tasksSheet.appendRow([
      task.id, task.title, task.description, task.status, task.priority,
      task.assigneeId || '', task.startDate, task.dueDate,
      (task.tags || []).join(','), (task.assigneeIds || []).join(','), task.clientId || ''
    ]);
  } else if (operation === 'update') {
    const data = tasksSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === task.id) {
        tasksSheet.getRange(i + 1, 1, 1, 11).setValues([[
          task.id, task.title, task.description, task.status, task.priority,
          task.assigneeId || '', task.startDate, task.dueDate,
          (task.tags || []).join(','), (task.assigneeIds || []).join(','), task.clientId || ''
        ]]);
        break;
      }
    }
  } else if (operation === 'delete') {
    const data = tasksSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === task.id) {
        tasksSheet.deleteRow(i + 1);
        break;
      }
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
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

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUserOperation(sheet, operation, user) {
  const usersSheet = sheet.getSheetByName('Users');

  if (operation === 'create') {
    usersSheet.appendRow([user.id, user.name, user.email, user.password || '', user.role, user.avatar]);
  } else if (operation === 'update') {
    const data = usersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === user.id) {
        usersSheet.getRange(i + 1, 1, 1, 6).setValues([[
          user.id, user.name, user.email, user.password || '', user.role, user.avatar
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

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'Apps Script activo' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============== PROCESO DIARIO AUTOMÁTICO ==============
// Este código va en tu Apps Script de Google Sheets

/**
 * Función principal que se ejecuta automáticamente cada día
 * Crea tareas hijas para todas las tareas madre que coincidan con hoy
 */
function processRecurringTasksDaily() {
  const lock = LockService.getScriptLock();

  try {
    // Intentar obtener el lock (evita ejecuciones simultáneas)
    lock.waitLock(30000); // 30 segundos max
  } catch (e) {
    Logger.log('No se pudo obtener el lock. Otra ejecución en curso.');
    return;
  }

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const tasksSheet = sheet.getSheetByName('Tasks');

    if (!tasksSheet) {
      Logger.log('ERROR: Hoja Tasks no encontrada');
      return;
    }

    const now = new Date();
    const today = Utilities.formatDate(now, 'GMT-5', 'yyyy-MM-dd');
    const todayDate = now;
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();

    Logger.log(`Zona horaria: ${Session.getScriptTimeZone()}`);
    Logger.log(`Fecha actual: ${new Date()}`);
    Logger.log(`Fecha formateada: ${today}`);
    Logger.log(`Día de semana: ${dayOfWeek} (0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb)`);


    Logger.log(`🌅 Proceso diario iniciado para: ${today} (día ${dayOfWeek})`);

    // Leer todas las tareas
    const data = tasksSheet.getDataRange().getValues();
    const headers = data[0];

    // Encontrar índices de columnas importantes
    const colId = headers.indexOf('id');
    const colTitle = headers.indexOf('tittle');
    const colDescription = headers.indexOf('description');
    const colStatus = headers.indexOf('status');
    const colPriority = headers.indexOf('priority');
    const colAssigneeId = headers.indexOf('assigneeId');
    const colStartDate = headers.indexOf('startDate');
    const colDueDate = headers.indexOf('dueDate');
    const colTags = headers.indexOf('tags');
    const colAssigneeIds = headers.indexOf('assigneeIds');
    const colClientId = headers.indexOf('clientId');
    const colCompletedDate = headers.indexOf('completedDate');
    const colRecurrence = headers.indexOf('recurrence');
    const colParentTaskId = headers.indexOf('parentTaskId');

    const tasks = data.slice(1); // Sin headers
    const newChildTasks = [];

    // Procesar cada tarea madre
    for (let i = 0; i < tasks.length; i++) {
      const row = tasks[i];
      const recurrenceJson = row[colRecurrence];
      const parentTaskId = row[colParentTaskId];

      // Solo procesar tareas madre (sin parentTaskId y con recurrence)
      if (parentTaskId || !recurrenceJson) continue;

      let recurrence;
      try {
        recurrence = JSON.parse(recurrenceJson);
      } catch (e) {
        Logger.log(`Error parseando recurrence de tarea ${row[colId]}: ${e}`);
        continue;
      }

      if (!recurrence || !recurrence.enabled) continue;

      // Verificar rango de fechas
      const startDate = new Date(row[colStartDate]);
      const endDate = new Date(recurrence.endDate || row[colDueDate]);

      // Fix date comparison to ignore time components for start/end checks if needed, 
      // but here we just need to ensure current date is within range.
      // Basic check:
      if (todayDate < startDate || todayDate > endDate) continue;


      Logger.log(`  📋 Tarea: "${row[colTitle] || 'undefined'}"`);
      Logger.log(`  Frecuencia: ${recurrence.frequency}`);
      Logger.log(`  Días: ${JSON.stringify(recurrence.days)}`);
      Logger.log(`  Hoy es día: ${dayOfWeek}`);


      // Verificar si debe crear tarea hoy según frecuencia
      let shouldCreate = false;

      if (recurrence.frequency === 'daily') {
        shouldCreate = true;
      } else if (recurrence.frequency === 'weekly') {
        const targetDays = recurrence.days || [];
        shouldCreate = targetDays.indexOf(dayOfWeek) !== -1;
      } else if (recurrence.frequency === 'monthly') {
        const targetDay = recurrence.dayOfMonth || 1;
        shouldCreate = dayOfMonth === targetDay;
      }

      if (!shouldCreate) {
        Logger.log(`  ⏭️ "${row[colTitle]}" - Hoy no coincide`);
        continue;
      }

      // Verificar si ya existe tarea hija para hoy
      const existsToday = tasks.some(t =>
        t[colParentTaskId] === row[colId] &&
        t[colStartDate] === today
      );

      if (existsToday) {
        Logger.log(`  ℹ️ "${row[colTitle]}" - Ya existe tarea para hoy`);
        continue;
      }

      // Crear tarea hija
      Logger.log(`  ✅ Creando tarea hija para "${row[colTitle]}"`);

      const childId = 't' + new Date().getTime() + '_child_' + today;
      const childTitle = `${row[colTitle]} (${today})`;

      const childRow = [];
      childRow[colId] = childId;
      childRow[colTitle] = childTitle;
      childRow[colDescription] = row[colDescription];
      childRow[colStatus] = 'todo';
      childRow[colPriority] = row[colPriority];
      childRow[colAssigneeId] = row[colAssigneeId];
      childRow[colStartDate] = today;
      childRow[colDueDate] = today;
      childRow[colTags] = row[colTags];
      childRow[colAssigneeIds] = row[colAssigneeIds];
      childRow[colClientId] = row[colClientId];
      childRow[colCompletedDate] = '';
      childRow[colRecurrence] = ''; // Las hijas no son recurrentes
      childRow[colParentTaskId] = row[colId];

      newChildTasks.push(childRow);
    }

    // Guardar todas las nuevas tareas hijas
    if (newChildTasks.length > 0) {
      tasksSheet.getRange(
        tasksSheet.getLastRow() + 1,
        1,
        newChildTasks.length,
        headers.length
      ).setValues(newChildTasks);

      Logger.log(`✅ ${newChildTasks.length} tareas hijas creadas para ${today}`);
    } else {
      Logger.log('ℹ️ No se crearon tareas nuevas hoy');
    }

  } catch (error) {
    Logger.log(`❌ Error en proceso diario: ${error.toString()}`);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Crear trigger diario (ejecutar esta función UNA VEZ manualmente)
 * Se ejecutará automáticamente cada día a las 6:00 AM
 */
function createDailyTrigger() {
  // Eliminar triggers antiguos primero
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processRecurringTasksDaily') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Crear nuevo trigger diario
  ScriptApp.newTrigger('processRecurringTasksDaily')
    .timeBased()
    .everyDays(1)
    .atHour(6) // 6:00 AM
    .create();

  Logger.log('✅ Trigger diario creado: Se ejecutará cada día a las 6:00 AM');
}

/**
 * Ejecutar manualmente (para testing)
 */
function runDailyProcessNow() {
  Logger.log('🚀 Ejecutando proceso diario manualmente...');
  processRecurringTasksDaily();
}
