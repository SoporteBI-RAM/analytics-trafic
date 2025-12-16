# 🔧 SOLUCIÓN: Apps Script no guarda en Sheets

## ❌ PROBLEMA:
- Creas/mueves tareas en el sistema
- NO se reflejan en Google Sheets
- La URL del Apps Script cambió

---

## ✅ SOLUCIÓN PASO A PASO:

### PASO 1: Verificar que el Apps Script está IMPLEMENTADO

1. Abrir Apps Script: https://script.google.com
2. Abrir tu proyecto "Tráfico Analítica RAM"
3. **IMPORTANTE:** Ver esquina superior derecha
   - Si dice "Implementar" → Click ahí
   - Si dice "Nueva implementación" → Click ahí
   
4. **Implementar como aplicación web:**
   ```
   - Ejecutar como: YO
   - Quién tiene acceso: Cualquier persona
   ```
   
5. Click "Implementar"
6. **COPIAR LA URL** que aparece (empieza con https://script.google.com/macros/s/...)

---

### PASO 2: Reemplazar TODO el código del Apps Script

1. En Apps Script, **BORRAR** todo el código actual
2. Ir al archivo: `google-apps-script-COMPLETO.js`
3. **COPIAR TODO** el contenido
4. **PEGAR** en Apps Script
5. Click "💾 Guardar" (Ctrl+S)

---

### PASO 3: Re-implementar

1. Click "Implementar" → "Administrar implementaciones"
2. Click en el ⚙️ de la implementación activa
3. Click "Nueva versión"
4. Descripción: "Con completedDate y sistema incremental"
5. Click "Implementar"
6. **COPIAR LA NUEVA URL**

---

### PASO 4: Actualizar .env.local

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/[TU_NUEVA_URL]/exec
```

**Reemplazar [TU_NUEVA_URL] con la URL que copiaste**

---

### PASO 5: Probar en Local

```bash
# Detener servidor (Ctrl+C)
# Iniciar de nuevo
npm run dev
```

**Probar:**
1. Crear una tarea
2. Abrir Google Sheets en otra pestaña
3. Verificar si aparece la tarea
4. Si NO aparece → Ir a Paso 6

---

### PASO 6: Debug - Ver errores en Console

```
1. F12 → Console
2. Crear una tarea
3. Buscar mensajes:
   - "✅ Tarea create en Sheets" = OK
   - "❌ Error" = Problema
   - "APPS_SCRIPT_URL no configurada" = .env.local mal
```

---

### PASO 7: Verificar Permisos

**Si el Apps Script pide permisos:**

1. Click "Revisar permisos"
2. Seleccionar tu cuenta
3. Click "Avanzado"
4. Click "Ir a [nombre del proyecto] (no seguro)"
5. Click "Permitir"

---

### PASO 8: Test Manual del Apps Script

**Probar directamente en Apps Script:**

```javascript
function testCreate() {
  var testData = {
    operation: 'create',
    type: 'task',
    item: {
      id: 'test-' + new Date().getTime(),
      title: 'Test desde Apps Script',
      description: 'Prueba',
      status: 'todo',
      priority: 'medium',
      assigneeId: '',
      startDate: '2025-12-17',
      dueDate: '2025-12-20',
      tags: [],
      assigneeIds: [],
      clientId: '',
      completedDate: ''
    }
  };
  
  var result = handleIncrementalOperation(
    SpreadsheetApp.getActiveSpreadsheet(),
    testData
  );
  
  Logger.log('Resultado: ' + result.getContent());
}
```

1. Copiar función arriba
2. Pegar AL FINAL del código de Apps Script
3. Click "▶️ Ejecutar" (seleccionar testCreate)
4. Ver si aparece en Sheets
5. Si aparece → Problema es la URL
6. Si NO aparece → Problema es el código

---

## 🔍 DIAGNÓSTICO RÁPIDO:

### ¿La tarea aparece en localStorage?
```
1. F12 → Application → Local Storage
2. Buscar "tasks"
3. Si está ahí = Frontend OK
4. Si NO está = Problema en frontend
```

### ¿Se llama a la API?
```
1. F12 → Network
2. Crear tarea
3. Buscar llamada a script.google.com
4. Si aparece = Se está llamando
5. Si NO aparece = APPS_SCRIPT_URL vacía
```

### ¿El Apps Script recibe la data?
```
1. Apps Script → Ejecuciones
2. Ver si hay ejecuciones recientes
3. Si hay = Código se ejecuta
4. Si NO hay = URL incorrecta
```

---

## 📝 CHECKLIST:

- [ ] Apps Script implementado como aplicación web
- [ ] Código completo pegado (google-apps-script-COMPLETO.js)
- [ ] URL nueva copiada
- [ ] .env.local actualizado con URL nueva
- [ ] Servidor reiniciado (npm run dev)
- [ ] Permisos otorgados
- [ ] Test manual funciona
- [ ] Console no muestra errores

---

## 🆘 SI SIGUE SIN FUNCIONAR:

### Prueba este código MÍNIMO en Apps Script:

```javascript
function doPost(e) {
  try {
    Logger.log('Recibido: ' + e.postData.contents);
    
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    let tasksSheet = sheet.getSheetByName('Tasks');
    
    if (!tasksSheet) {
      tasksSheet = sheet.insertSheet('Tasks');
      tasksSheet.appendRow(['id', 'title', 'status']);
    }
    
    if (data.operation === 'create' && data.type === 'task') {
      tasksSheet.appendRow([
        data.item.id,
        data.item.title,
        data.item.status
      ]);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error: ' + error);
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

**Si este código funciona:**
- El problema está en el código complejo
- Usa este y agrega columnas progresivamente

**Si este código NO funciona:**
- El problema es la configuración/permisos
- Revisar implementación y permisos

---

## 📧 DATOS PARA SOPORTE:

Si nada funciona, copia esta info:

```
Sheet ID: 1jGKdkgzHBFLyXmAcGYKLF5dmjQhCtyaGPqWEJOhEi48
Apps Script URL: [tu URL]
Error en Console: [copiar error]
Apps Script Ejecuciones: [screenshot]
```

---

**¡Sigue estos pasos y debería funcionar!** 🚀
