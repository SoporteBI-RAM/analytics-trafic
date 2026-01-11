const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEETS_ID;
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

export const sheetsService = {
  async getClients() {
    try {
      console.log('🔄 Cargando clientes de Sheets...');
      const range = 'Clients!A:B';
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;

      if (!API_KEY || !SHEET_ID) {
        console.error('❌ Faltan credenciales para clientes:', { API_KEY: !!API_KEY, SHEET_ID: !!SHEET_ID });
        return [];
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        console.error('❌ Error de Google Sheets API (clientes):', data.error);
        return [];
      }

      if (!data.values || data.values.length <= 1) {
        console.warn('⚠️ Hoja Clients vacía o sin datos');
        return [];
      }

      const [headers, ...rows] = data.values;
      console.log(`✅ ${rows.length} clientes cargados`);
      return rows.map(row => ({
        id: row[0] || '',
        name: row[1] || ''
      }));
    } catch (error) {
      console.error('❌ Error loading clients from Sheets:', error);
      const saved = localStorage.getItem('clients');
      return saved ? JSON.parse(saved) : [];
    }
  },

  async getUsers() {
    try {
      console.log('🔄 Cargando usuarios de Sheets...');
      const range = 'Users!A:F';
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;

      if (!API_KEY || !SHEET_ID) {
        console.error('❌ Faltan credenciales:', { API_KEY: !!API_KEY, SHEET_ID: !!SHEET_ID });
        return [];
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        console.error('❌ Error de Google Sheets API:', data.error);
        return [];
      }

      if (!data.values || data.values.length <= 1) {
        console.warn('⚠️ Hoja Users vacía o sin datos');
        return [];
      }

      const [headers, ...rows] = data.values;
      console.log(`✅ ${rows.length} usuarios cargados`);
      return rows.map(row => ({
        id: row[0] || '',
        name: row[1] || '',
        email: row[2] || '',
        password: row[3] || '',
        role: row[4] || 'Analyst',
        avatar: row[5] || 'https://picsum.photos/seed/default/200'
      }));
    } catch (error) {
      console.error('❌ Error loading users from Sheets:', error);
      return [];
    }
  },

  async getTasks() {
    try {
      console.log('🔄 Cargando tareas de Sheets...');
      const range = 'Tasks!A:N'; // Hasta N (14 columnas: id...parentTaskId)
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;

      if (!API_KEY || !SHEET_ID) {
        console.error('❌ Faltan credenciales para tareas:', { API_KEY: !!API_KEY, SHEET_ID: !!SHEET_ID });
        return [];
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        console.error('❌ Error de Google Sheets API (tareas):', data.error);
        return [];
      }

      if (!data.values || data.values.length <= 1) {
        console.warn('⚠️ Hoja Tasks vacía o sin datos');
        return [];
      }

      // Helper para normalizar fechas
      const normalizeDate = (dateStr: string) => {
        if (!dateStr) {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        // Si ya es YYYY-MM-DD, devolver tal cual
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr;
        }
        // Si tiene hora (ISO), extraer solo fecha
        if (dateStr.includes('T')) {
          return dateStr.split('T')[0];
        }
        // Intentar parsear y devolver en formato local
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };

      const [headers, ...rows] = data.values;
      console.log(`✅ ${rows.length} tareas cargadas`);
      return rows.map(row => {
        // Parsear recurrence
        let recurrence = undefined;
        let isRecurring = false;

        if (row[12]) {
          try {
            recurrence = JSON.parse(row[12]);
            isRecurring = true;

            // Normalizar days a daysOfWeek si existe
            if (recurrence && recurrence.days && !recurrence.daysOfWeek) {
              const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              recurrence.daysOfWeek = recurrence.days.map((d: number) => dayNames[d]);
              recurrence.enabled = true; // Asegurar que esté enabled
              console.log('  🔄 Normalizado recurrence:', recurrence);
            }
          } catch (e) {
            console.warn('Error parseando recurrence:', row[12]);
          }
        }

        return {
          id: row[0] || '',
          title: row[1] || '',
          description: row[2] || '',
          status: row[3] || 'todo',
          priority: row[4] || 'medium',
          assigneeId: row[5] || null,
          startDate: normalizeDate(row[6]),
          dueDate: normalizeDate(row[7]),
          tags: row[8] ? row[8].split(',').map((t: string) => t.trim()) : [],
          assigneeIds: row[9] ? row[9].split(',').map((t: string) => t.trim()) : (row[5] ? [row[5]] : []),
          clientId: row[10] || null,
          completedDate: row[11] || null,
          isRecurring,
          recurrence,
          instances: [], // Siempre inicializar vacío - se generan dinámicamente
          parentTaskId: row[13] || null
        };
      });
    } catch (error) {
      console.error('Error loading tasks from Sheets:', error);
      return [];
    }
  },

  async saveTasks(tasks: any[]) {
    // Solo guardar en localStorage - las tareas se sincronizan individualmente
    localStorage.setItem('tasks', JSON.stringify(tasks));
  },

  async addTask(task: any) {
    if (!APPS_SCRIPT_URL) return;
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'add_task', task }),
        mode: 'no-cors'
      });
      console.log('✅ Tarea agregada en Sheets');
    } catch (error) {
      console.error('❌ Error agregando tarea:', error);
    }
  },

  async updateTask(task: any) {
    if (!APPS_SCRIPT_URL) return;
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'update_task', task }),
        mode: 'no-cors'
      });
      console.log('✅ Tarea actualizada en Sheets');
    } catch (error) {
      console.error('❌ Error actualizando tarea:', error);
    }
  },

  async deleteTask(taskId: string) {
    if (!APPS_SCRIPT_URL) return;
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'delete_task', taskId }),
        mode: 'no-cors'
      });
      console.log('✅ Tarea eliminada en Sheets');
    } catch (error) {
      console.error('❌ Error eliminando tarea:', error);
    }
  },

  async addClient(client: any) {
    if (!APPS_SCRIPT_URL) return;
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'add_client', client }),
        mode: 'no-cors'
      });
      console.log('✅ Cliente agregado en Sheets');
    } catch (error) {
      console.error('❌ Error agregando cliente:', error);
    }
  },

  async updateClient(client: any) {
    if (!APPS_SCRIPT_URL) return;
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'update_client', client }),
        mode: 'no-cors'
      });
      console.log('✅ Cliente actualizado en Sheets');
    } catch (error) {
      console.error('❌ Error actualizando cliente:', error);
    }
  },

  async deleteClient(clientId: string) {
    if (!APPS_SCRIPT_URL) return;
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'delete_client', clientId }),
        mode: 'no-cors'
      });
      console.log('✅ Cliente eliminado en Sheets');
    } catch (error) {
      console.error('❌ Error eliminando cliente:', error);
    }
  },

  // LEGACY - NO USAR: Guarda TODOS los usuarios (causa duplicados)
  // Usar saveUserIncremental en su lugar
  /*
  async saveUsers(users: any[]) {
    // Guardar en localStorage como backup
    localStorage.setItem('users', JSON.stringify(users));
    
    // Intentar guardar en Sheets si hay URL de Apps Script
    if (!APPS_SCRIPT_URL) {
      console.warn('APPS_SCRIPT_URL no configurada. Solo guardando en localStorage.');
      return;
    }
    
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users }),
        mode: 'no-cors'
      });
      
      console.log('✅ Usuarios guardados en Google Sheets');
    } catch (error) {
      console.error('❌ Error guardando usuarios en Sheets:', error);
      console.log('Los usuarios se guardaron solo en localStorage');
    }
  },
  */

  // LEGACY - NO USAR: Guarda TODOS los clientes (causa duplicados)
  // Usar saveClientIncremental en su lugar
  /*
  async saveClients(clients: any[]) {
    localStorage.setItem('clients', JSON.stringify(clients));
    
    if (!APPS_SCRIPT_URL) {
      console.warn('APPS_SCRIPT_URL no configurada. Solo guardando en localStorage.');
      return;
    }
    
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clients }),
        mode: 'no-cors'
      });
      
      console.log('✅ Clientes guardados en Google Sheets');
    } catch (error) {
      console.error('❌ Error guardando clientes en Sheets:', error);
      console.log('Los clientes se guardaron solo en localStorage');
    }
  },
  */

  // NUEVAS FUNCIONES: Operaciones incrementales
  async saveTaskIncremental(operation: 'create' | 'update' | 'delete', task: any) {
    if (!APPS_SCRIPT_URL) {
      console.warn('APPS_SCRIPT_URL no configurada');
      return;
    }

    try {
      // Preparar task sin instances (Apps Script actual no lo soporta)
      const taskForSheets = {
        ...task,
        instances: undefined // NO enviar instances
      };

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // 'text/plain' evita el preflight OPTIONS que Apps Script no soporta
        body: JSON.stringify({ operation, type: 'task', item: taskForSheets }),
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error('❌ Error devuelto por el script:', result.error);
      }
    } catch (error) {
      console.error(`❌ Error ${operation} tarea:`, error);
    }
  },

  async saveClientIncremental(operation: 'create' | 'update' | 'delete', client: any) {
    if (!APPS_SCRIPT_URL) {
      console.warn('APPS_SCRIPT_URL no configurada');
      return;
    }

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, type: 'client', item: client }),
        mode: 'no-cors'
      });
      console.log(`✅ Cliente ${operation} en Sheets`);
    } catch (error) {
      console.error(`❌ Error ${operation} cliente:`, error);
    }
  },

  async saveUserIncremental(operation: 'create' | 'update' | 'delete', user: any) {
    if (!APPS_SCRIPT_URL) {
      console.warn('APPS_SCRIPT_URL no configurada');
      return;
    }

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, type: 'user', item: user }),
        mode: 'no-cors'
      });
      console.log(`✅ Usuario ${operation} en Sheets`);
    } catch (error) {
      console.error(`❌ Error ${operation} usuario:`, error);
    }
  }
};
