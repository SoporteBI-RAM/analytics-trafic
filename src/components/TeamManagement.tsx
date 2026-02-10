import React, { useState } from 'react';
import { User } from '../types';
import { Users, Plus, Edit, Trash2, Save, X, Upload, Cake } from 'lucide-react';
import { generateAvatarDataUrl } from '../utils/avatarUtils';

interface TeamManagementProps {
  users: User[];
  currentUser: User;
  onCreateUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({
  users,
  currentUser,
  onCreateUser,
  onUpdateUser,
  onDeleteUser
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'Analyst' as User['role'],
    avatar: '',
    avatarColor: '#3B82F6',
    isActive: true,
    birthday: ''
  });

  const avatarColors = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#10B981', // Green
    '#EF4444', // Red
    '#6366F1', // Indigo
    '#14B8A6', // Teal
  ];

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        id: user.id,
        name: user.name,
        email: user.email,
        password: '', // Never preload password
        role: user.role,
        avatar: user.avatar,
        avatarColor: user.avatarColor || '#3B82F6',
        isActive: user.isActive !== false,
        birthday: user.birthday || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        id: `u${Date.now()}`,
        name: '',
        email: '',
        password: '',
        role: 'Analyst',
        avatar: '',
        avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
        isActive: true,
        birthday: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare final form data
    let finalFormData = { ...formData };

    // Generate avatar if no image uploaded and name is provided
    if (!finalFormData.avatar && finalFormData.name.trim()) {
      finalFormData.avatar = generateAvatarDataUrl(
        finalFormData.name,
        finalFormData.avatarColor
      );
    }

    if (editingUser) {
      // Update existing user
      onUpdateUser(finalFormData);
    } else {
      // Create new user
      onCreateUser(finalFormData);
    }

    handleCloseModal();
  };

  const handleDelete = (userId: string) => {
    if (confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      onDeleteUser(userId);
    }
  };

  const canEdit = (targetUser: User) => {
    return currentUser.role === 'Admin' || currentUser.id === targetUser.id;
  };

  const canDelete = () => {
    return currentUser.role === 'Admin';
  };

  const isAdmin = currentUser.role === 'Admin';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Equipo</h2>
          <p className="text-sm text-gray-500 mt-1">
            {users.length} miembros ({users.filter(u => u.isActive !== false).length} activos)
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            Nuevo Miembro
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative overflow-hidden">
            {user.isActive === false && (
              <div className="absolute top-0 right-0 bg-gray-100 text-gray-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest border-l border-b border-gray-200">
                Desactivado
              </div>
            )}
            <div className={`flex items-start gap-4 ${user.isActive === false ? 'opacity-60' : ''}`}>
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold border-2 border-gray-100"
                  style={{ backgroundColor: user.avatarColor || '#3B82F6' }}
                >
                  {user.name.split(' ').map(n => n.charAt(0).toUpperCase()).join('').substring(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 truncate">{user.name}</h3>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
                {user.birthday && (
                  <p className="text-xs text-pink-600 font-medium mt-1 flex items-center gap-1">
                    <Cake size={12} /> {new Date(user.birthday + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                    {user.role}
                  </span>
                  {currentUser.id === user.id && (
                    <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full border border-green-200">
                      Tú
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 min-h-[52px]">
              {canEdit(user) && (
                <button
                  onClick={() => handleOpenModal(user)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit size={14} />
                  Editar
                </button>
              )}
              {canDelete() && (
                <button
                  onClick={() => handleDelete(user.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingUser ? 'Editar Miembro' : 'Nuevo Miembro del Equipo'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {formData.avatar ? (
                    <img
                      src={formData.avatar}
                      alt="Avatar"
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                    />
                  ) : (
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-gray-100"
                      style={{ backgroundColor: formData.avatarColor }}
                    >
                      {formData.name.split(' ').map(n => n.charAt(0).toUpperCase()).join('').substring(0, 2) || 'U'}
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-lg">
                    <Upload size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="flex gap-2 mt-2 items-center">
                  <p className="text-xs text-gray-500">Click para subir foto</p>
                  {formData.avatar && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar: '' })}
                      className="text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                {!formData.avatar && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-2 text-center">Color del avatar</label>
                    <div className="flex gap-2 justify-center">
                      {avatarColors.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, avatarColor: color })}
                          className={`w-8 h-8 rounded-full transition-transform ${formData.avatarColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                            }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled={!!editingUser}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${editingUser ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                  placeholder="usuario@ram.com"
                  required
                />
              </div>

              {/* Cumpleaños */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Cumpleaños</label>
                <input
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña {editingUser && '(dejar vacío para no cambiar)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : ''}
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!isAdmin}
                >
                  <option value="Admin">Admin</option>
                  <option value="Analyst">Analyst</option>
                </select>
                {!isAdmin && (
                  <p className="text-xs text-gray-500 mt-1">Solo los administradores pueden cambiar roles.</p>
                )}
              </div>

              {/* Estado Activo - Solo Admin */}
              {isAdmin && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="text-sm font-bold text-gray-800">Estado del Usuario</p>
                    <p className="text-xs text-gray-500">
                      {formData.isActive ? 'El usuario es visible y puede usar el sistema' : 'El usuario está oculto para analistas'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.isActive ? 'bg-teal-500' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#0078D4] text-white rounded-lg hover:bg-[#006cbd] flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
