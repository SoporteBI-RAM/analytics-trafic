import React, { useState } from 'react';
import { User } from '../types';
import { sheetsService } from '../services/sheetsService';
import { MOCK_USERS } from '../constants';
import { LayoutDashboard } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Cargar usuarios de Sheets
      let users = await sheetsService.getUsers();

      // Si no hay usuarios en Sheets, usar MOCK_USERS
      if (users.length === 0) {
        users = MOCK_USERS;
        console.log('⚠️ Usando usuarios mock (Sheets vacío)');
      }

      const user = users.find(u => u.email === email && u.password === password);

      if (user) {
        const { password, ...userWithoutPassword } = user;
        onLogin(userWithoutPassword as User);
      } else {
        setError('Email o contraseña incorrectos');
      }
    } catch (err) {
      console.error('❌ Error cargando usuarios:', err);
      setError('Error de conexión. Usando datos locales.');

      // Fallback a MOCK_USERS
      const user = MOCK_USERS.find(u => u.email === email && u.password === password);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        onLogin(userWithoutPassword as User);
      } else {
        setError('Email o contraseña incorrectos');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img
              src="https://rangle.ec/img/ram.webp"
              alt="RAM Logo"
              className="h-24 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Tráfico Analítica RAM</h1>
          <p className="text-gray-500">Sistema de Gestión de Tareas</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
            <input
              type="email"
              placeholder="usuario@rangle.ec"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 shadow-lg shadow-blue-200"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Verificando...
              </div>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
