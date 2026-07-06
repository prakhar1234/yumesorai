'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  last_login_at: string;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/ops/maestro/users');
        const data = await response.json();

        if (response.ok) {
          setUsers(data.users || []);
        } else {
          setError(data.error || 'Failed to load users');
        }
      } catch (err) {
        setError('An error occurred while loading users');
        console.error('[UserManagement] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setFormError('');
    setFormSuccess('');

    try {
      const response = await fetch('/api/ops/maestro/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(
          Array.isArray(data.errors) ? data.errors[0] : data.error || 'Failed to create user'
        );
        return;
      }

      setFormSuccess('User created successfully');
      setUsers([...users, data.user]);
      setFormData({ username: '', password: '', email: '', full_name: '' });

      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
      }, 2000);
    } catch (err) {
      setFormError('An error occurred while creating the user');
      console.error('[UserManagement] Create error:', err);
    } finally {
      setCreatingUser(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading users...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Admin Users</h2>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
        >
          ➕ Add User
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {users.length === 0 ? (
        <p className="text-gray-600">No users found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-900">Username</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900">Full Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.full_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Admin User">
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">{formSuccess}</p>
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="john_doe"
              disabled={creatingUser}
              required
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
              disabled={creatingUser}
              required
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password * (Min 12 chars, uppercase, lowercase, number, special char)
            </label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="SecurePass123!"
              disabled={creatingUser}
              required
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name (Optional)
            </label>
            <Input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="John Doe"
              disabled={creatingUser}
              className="w-full"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={creatingUser}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creatingUser}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              {creatingUser ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
