'use client';

import { useEffect, useState } from 'react';
import type { AppUser } from '@/types';

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'user' | 'super_admin'>('user');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });

    if (res.ok) {
      setEmail('');
      setRole('user');
      fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to invite user');
    }
    setSubmitting(false);
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'super_admin' ? 'user' : 'super_admin';
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });

    if (res.ok) {
      fetchUsers();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to update role');
    }
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`Remove ${userEmail} from the invite list?`)) return;

    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });

    if (res.ok) {
      fetchUsers();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to remove user');
    }
  };

  if (loading) return <p className="text-[#222]/50 text-center py-12">Loading...</p>;

  if (forbidden) {
    return (
      <div className="text-center py-12">
        <p className="text-[#222]/50">You don&apos;t have permission to manage users.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="section-heading text-base mb-6">User Management</h1>

      <form onSubmit={handleInvite} className="bg-white rounded-[4px] border border-[#F0EFED] p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 px-3 py-2 border border-[#F0EFED] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8D6]/40 focus:border-[#5BB8D6]"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'user' | 'super_admin')}
            className="px-3 py-2 border border-[#F0EFED] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8D6]/40 focus:border-[#5BB8D6]"
          >
            <option value="user">User</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-[#5BB8D6] text-white rounded-[4px] text-sm uppercase tracking-wider hover:bg-[#5BB8D6]/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Inviting...' : 'Invite'}
          </button>
        </div>
        {error && <p className="text-[#D4705A] text-sm mt-2">{error}</p>}
      </form>

      <div className="bg-white rounded-[4px] border border-[#F0EFED] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F0EFED] bg-[#F0EFED]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#222]/60 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#222]/60 uppercase">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#222]/60 uppercase">Added</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#222]/60 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[#F0EFED] last:border-0">
                <td className="px-4 py-3 text-sm text-[#222]">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-[4px] text-xs font-medium ${
                    u.role === 'super_admin'
                      ? 'bg-[#5BB8D6]/15 text-[#5BB8D6]'
                      : 'bg-[#F0EFED] text-[#222]/60'
                  }`}>
                    {u.role === 'super_admin' ? 'Super Admin' : 'User'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-[#222]/60">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleToggleRole(u.id, u.role)}
                      className="text-xs text-[#5BB8D6] hover:text-[#5BB8D6]/80 cursor-pointer"
                    >
                      {u.role === 'super_admin' ? 'Make User' : 'Make Admin'}
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.email)}
                      className="text-xs text-[#D4705A] hover:text-[#D4705A]/80 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
