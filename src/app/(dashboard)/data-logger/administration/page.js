'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import Topbar from '@/components/Topbar';
import { Card, SectionTitle } from '@/components/data-logger/ui';
import { showSuccess } from '@/lib/toast';

const INITIAL_USERS = [
  { id: 'usr-1', name: 'Amit Jain', email: 'amit@ornatesolar.com', role: 'Administrator', status: 'Active', lastActive: 'Now' },
  { id: 'usr-2', name: 'Priya Sharma', email: 'priya@ornatesolar.com', role: 'Operator', status: 'Active', lastActive: '12 minutes ago' },
  { id: 'usr-3', name: 'Rahul Mehta', email: 'rahul@ornatesolar.com', role: 'Viewer', status: 'Invited', lastActive: 'Invitation pending' },
];

const ROLE_PERMISSIONS = {
  Administrator: ['Manage users and roles', 'Upload documentation', 'Manage all assets', 'Raise and manage cases'],
  Operator: ['View installations and monitoring', 'Upload assigned documents', 'Raise and update cases'],
  Viewer: ['View shared installations', 'View and download documents', 'View assigned cases'],
};

export default function AdministrationPage() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(INITIAL_USERS[0].id);
  const [deleteUser, setDeleteUser] = useState(null);
  const selected = users.find((user) => user.id === selectedId) ?? users[0];
  const filteredUsers = useMemo(() => users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase())), [query, users]);
  const updateRole = (id, role) => { setUsers((current) => current.map((user) => user.id === id ? { ...user, role } : user)); showSuccess('Role updated in preview'); };
  const removeUser = () => { setUsers((current) => current.filter((user) => user.id !== deleteUser.id)); setSelectedId(null); setDeleteUser(null); showSuccess('User removed in preview'); };

  return <>
    <Topbar title="Administration" breadcrumbs={['Data Logger', 'Administration']} />
    <main className="mx-auto max-w-350 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-start gap-3"><div><SectionTitle icon={<ShieldCheck className="h-4 w-4" />}>User Access Management</SectionTitle><p className="mt-1 text-sm text-muted">Manage users, roles, and permission templates.</p></div><button onClick={() => showSuccess('User invite flow is ready for backend integration')} className="ml-auto flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-[#dc6d12]"><Plus className="h-4 w-4" /> Add user</button></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]"><Card className="p-4 sm:p-5"><div className="flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2"><Search className="h-4 w-4 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" className="w-full bg-transparent text-sm outline-none placeholder:text-muted" /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-170 text-left"><thead className="border-y border-line bg-canvas text-xs font-medium text-muted"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last active</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-line">{filteredUsers.map((user) => <tr key={user.id} onClick={() => setSelectedId(user.id)} className={`cursor-pointer text-sm ${selected?.id === user.id ? 'bg-brand/5' : 'hover:bg-canvas'}`}><td className="px-4 py-4"><p className="font-medium text-ink">{user.name}</p><p className="mt-0.5 text-xs text-muted">{user.email}</p></td><td className="px-4 py-4"><select value={user.role} onClick={(event) => event.stopPropagation()} onChange={(event) => updateRole(user.id, event.target.value)} className="rounded border border-line bg-white px-2 py-1 text-xs text-ink outline-none"><option>Administrator</option><option>Operator</option><option>Viewer</option></select></td><td className="px-4 py-4"><Status value={user.status} /></td><td className="px-4 py-4 text-muted">{user.lastActive}</td><td className="px-4 py-4"><button onClick={(event) => { event.stopPropagation(); setDeleteUser(user); }} aria-label={`Delete ${user.name}`} className="rounded p-2 text-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div></Card>
      <PermissionPanel user={selected} /></div>
      <p className="mt-3 text-xs text-muted">Frontend preview only. Your backend must validate the logged-in administrator and enforce every role, permission, invitation, and deletion action.</p>
    </main>
    {deleteUser && <DeleteDialog user={deleteUser} onCancel={() => setDeleteUser(null)} onConfirm={removeUser} />}
  </>;
}

function PermissionPanel({ user }) { if (!user) return <Card className="p-5 text-sm text-muted">Select a user to view permissions.</Card>; return <Card className="p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand"><Users className="h-5 w-5" /></span><div><p className="font-semibold text-ink">{user.name}</p><p className="text-xs text-muted">{user.role}</p></div></div><div className="mt-5 border-t border-line pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Role permissions</p><ul className="mt-3 space-y-2">{ROLE_PERMISSIONS[user.role].map((permission) => <li key={permission} className="flex items-start gap-2 text-sm text-ink"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-good" />{permission}</li>)}</ul></div></Card>; }
function Status({ value }) { return <span className={`rounded-full px-2 py-1 text-xs font-medium ${value === 'Active' ? 'bg-good/10 text-good' : 'bg-warn/10 text-warn'}`}>{value}</span>; }
function DeleteDialog({ user, onCancel, onConfirm }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-user-title"><Card className="w-full max-w-md p-5 shadow-xl"><div className="flex justify-between"><div><h2 id="delete-user-title" className="text-base font-semibold text-ink">Remove user?</h2><p className="mt-2 text-sm text-muted">Remove <strong className="text-ink">{user.name}</strong> from this organization? The backend should confirm this action before permanently deleting access.</p></div><button onClick={onCancel} aria-label="Close" className="h-fit rounded p-1 text-muted hover:bg-canvas"><X className="h-5 w-5" /></button></div><div className="mt-5 flex justify-end gap-2"><button onClick={onCancel} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas">Cancel</button><button onClick={onConfirm} className="rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white">Remove user</button></div></Card></div>; }
