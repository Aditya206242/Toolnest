import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Mail, ShieldAlert, CheckCircle, Trash2, Shield, Clock, PlusCircle } from 'lucide-react';
import SEO from '../components/SEO';

const DEFAULT_MEMBERS = [
  { id: '1', email: 'aditya.kumar@toolnest.com', fullName: 'Aditya Kumar', role: 'admin', status: 'active', avatar: 'AK' },
  { id: '2', email: 'sam.developer@toolnest.com', fullName: 'Sam Developer', role: 'member', status: 'active', avatar: 'SD' },
  { id: '3', email: 'jane.designer@toolnest.com', fullName: 'Jane Designer', role: 'member', status: 'pending', avatar: 'JD' },
];

export default function TeamSettings() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteName, setInviteName] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Limit based on role
  const isPremium = user?.role === 'premium' || user?.role === 'admin';
  const memberLimit = isPremium ? 15 : 5;

  useEffect(() => {
    // Load members from localStorage or set defaults
    const stored = localStorage.getItem('toolnest_team_members');
    if (stored) {
      setMembers(JSON.parse(stored));
    } else {
      // Set current user as first member if default
      const currentMember = {
        id: 'user-' + user?.id,
        email: user?.email,
        fullName: user?.fullName || 'You',
        role: 'admin',
        status: 'active',
        avatar: user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'
      };
      const defaults = [currentMember, ...DEFAULT_MEMBERS.filter(m => m.email !== user?.email)];
      setMembers(defaults);
      localStorage.setItem('toolnest_team_members', JSON.stringify(defaults));
    }
  }, [user]);

  const handleInvite = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!inviteEmail || !inviteName) {
      setError('Please fill in both name and email.');
      return;
    }

    if (members.length >= memberLimit) {
      setError(`Team limit reached. Upgrade to Premium to add more than ${memberLimit} team members.`);
      return;
    }

    if (members.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      setError('A member with this email already exists in your team.');
      return;
    }

    const initials = inviteName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const newMember = {
      id: Date.now().toString(),
      email: inviteEmail.toLowerCase(),
      fullName: inviteName,
      role: inviteRole,
      status: 'pending',
      avatar: initials || '?'
    };

    const updated = [...members, newMember];
    setMembers(updated);
    localStorage.setItem('toolnest_team_members', JSON.stringify(updated));

    setInviteEmail('');
    setInviteName('');
    setInviteRole('member');
    setSuccess(`Invitation sent successfully to ${inviteName}!`);
  };

  const handleRemove = (id, name) => {
    if (window.confirm(`Are you sure you want to remove ${name} from the team?`)) {
      const updated = members.filter(m => m.id !== id);
      setMembers(updated);
      localStorage.setItem('toolnest_team_members', JSON.stringify(updated));
      setSuccess(`${name} removed successfully.`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <SEO title="Team Management - ToolNest" description="Manage team settings, invite teammates, and assign roles on ToolNest." />

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent">
            Team Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Collaborate on documents, assign roles, and share automated workflows with your team.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
          Team Size: <span className="font-extrabold text-violet-600 dark:text-violet-400">{members.length}</span> / {memberLimit} members
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Invite Form */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm sticky top-24">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-violet-500" />
              Invite Teammate
            </h2>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-2 text-xs font-semibold">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-xs font-semibold">
                <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-4 text-xs font-semibold focus:border-violet-500 focus:outline-none dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="john@company.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 pl-10 pr-4 text-xs font-semibold focus:border-violet-500 focus:outline-none dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Role
                </label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs font-semibold focus:border-violet-500 focus:outline-none dark:text-slate-100 cursor-pointer appearance-none"
                  >
                    <option value="member">Team Member</option>
                    <option value="admin">Team Admin</option>
                    <option value="viewer">Viewer (Read-only)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 font-bold text-xs py-3 rounded-xl bg-violet-600 hover:bg-violet-750 text-white shadow-lg shadow-violet-600/25 transition cursor-pointer mt-2"
              >
                <PlusCircle className="h-4 w-4" />
                Send Invitation
              </button>
            </form>
          </div>
        </div>

        {/* Right column: Team List */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-500" />
              Teammates
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-150 dark:border-slate-800/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                    <th className="pb-3 pl-2">Teammate</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {members.map((member) => (
                    <tr key={member.id} className="text-xs group hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500/10 to-indigo-500/10 text-violet-600 dark:text-violet-400 font-extrabold flex items-center justify-center border border-violet-500/10">
                            {member.avatar}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{member.fullName}</span>
                            <span className="text-[10px] text-slate-400 truncate">{member.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 font-semibold capitalize text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5 text-slate-400" />
                          {member.role}
                        </span>
                      </td>
                      <td className="py-4">
                        {member.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10">
                            <Clock className="h-3 w-3" />
                            Invited
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right pr-2">
                        {/* Don't let users remove themselves in this panel */}
                        {member.email.toLowerCase() !== user?.email?.toLowerCase() ? (
                          <button
                            onClick={() => handleRemove(member.id, member.fullName)}
                            className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-red-500/20 hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition cursor-pointer"
                            title="Remove Teammate"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 italic px-2">Owner</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
