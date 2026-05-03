import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, ensureVerified } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc, where, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Activity, ShieldCheck, Database, Server, Smartphone, History, CheckCircle2, AlertCircle, Building2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { auth } from '../lib/firebase';

export default function AdminModule({ profile }: { profile: any }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  const [businessSettings, setBusinessSettings] = useState({
    businessName: profile?.businessName || 'ChickMart',
    businessAddress: profile?.businessAddress || 'Digwadih, Dhanbad, Jharkhand, 828113',
    businessEmail: profile?.businessEmail || 'chiranjeev972@gmail.com',
    businessPhone: profile?.businessPhone || '8987766981'
  });

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to update business settings.");
        setIsSaving(false);
        return;
      }
      await updateDoc(doc(db, 'users', auth.currentUser.uid), businessSettings);
      alert('Business profile updated successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users-profile');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setBusinessSettings({
        businessName: profile.businessName || '',
        businessAddress: profile.businessAddress || '',
        businessEmail: profile.businessEmail || '',
        businessPhone: profile.businessPhone || ''
      });
    }
  }, [profile]);
  const [health, setHealth] = useState({
    db: 'online',
    auth: 'online',
    storage: 'online',
    latency: '24ms'
  });

  useEffect(() => {
    if (!profile) return;

    let q = query(collection(db, 'activity_logs'), where('ownerId', '==', profile.uid), limit(50));
    if (filter !== 'all') {
      q = query(collection(db, 'activity_logs'), where('ownerId', '==', profile.uid), where('type', '==', filter), limit(50));
    }
    const unsub = onSnapshot(q, (snap) => {
      const sortedLogs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(sortedLogs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'activity_logs'));

    return () => unsub();
  }, [filter, profile]);

  return (
    <div className="space-y-8 pb-12">
      {/* Business Profile Settings */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="text-orange-600" size={24} />
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Business Profile</h2>
        </div>
        <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
          <CardContent className="p-8">
            <form onSubmit={handleUpdateSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-stone-400">Business / Shop Name</Label>
                  <Input 
                    value={businessSettings.businessName}
                    onChange={e => setBusinessSettings({...businessSettings, businessName: e.target.value})}
                    placeholder="e.k. KV Enterprises"
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-stone-400">Contact Number</Label>
                  <Input 
                    value={businessSettings.businessPhone}
                    onChange={e => setBusinessSettings({...businessSettings, businessPhone: e.target.value})}
                    placeholder="+91 12345 67890"
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-stone-400">Business Email</Label>
                  <Input 
                    value={businessSettings.businessEmail}
                    onChange={e => setBusinessSettings({...businessSettings, businessEmail: e.target.value})}
                    placeholder="contact@business.com"
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-stone-400">Full Address</Label>
                  <Input 
                    value={businessSettings.businessAddress}
                    onChange={e => setBusinessSettings({...businessSettings, businessAddress: e.target.value})}
                    placeholder="Street, City, State, ZIP"
                    className="rounded-xl h-12"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving} className="rounded-xl bg-stone-900 text-white h-12 px-8 flex gap-2">
                  <Save size={18} />
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* System Health Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Activity className="text-orange-600" size={24} />
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">System Health & Security</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Firestore DB', status: health.db === 'online' ? 'Healthy' : 'Offline', icon: <Database size={20} />, color: health.db === 'online' ? 'text-green-600' : 'text-red-600' },
            { label: 'Auth Service', status: health.auth === 'online' ? 'Healthy' : 'Offline', icon: <ShieldCheck size={20} />, color: health.auth === 'online' ? 'text-green-600' : 'text-red-600' },
            { label: 'Cloud Servers', status: health.storage === 'online' ? 'Healthy' : 'Offline', icon: <Server size={20} />, color: health.storage === 'online' ? 'text-green-600' : 'text-red-600' },
            { label: 'API Latency', status: health.latency, icon: <Smartphone size={20} />, color: 'text-orange-600' },
          ].map((item, i) => (
            <Card key={i} className="rounded-3xl border-stone-200 shadow-sm overflow-hidden">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-stone-50 ${item.color}`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest">{item.label}</p>
                    <p className="text-sm font-bold text-stone-900">{item.status}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse ${item.status === 'Healthy' || item.label === 'API Latency' ? 'bg-green-500' : 'bg-red-500'}`} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Activity Logs Section */}
      <section>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <History className="text-orange-600" size={24} />
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Recent Activity Logs</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {['all', 'new_sale', 'stock_movement', 'delivery_update', 'new_batch'].map(t => (
              <Button 
                key={t} 
                variant={filter === t ? 'default' : 'outline'} 
                size="sm" 
                className="rounded-full capitalize whitespace-nowrap"
                onClick={() => setFilter(t)}
              >
                {t.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
        
        <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Time</th>
                    <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">User</th>
                    <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Action</th>
                    <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs text-stone-500">
                        {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-stone-900">{log.userName || log.userId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs uppercase font-bold text-stone-600 tracking-tight">{log.type.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="rounded-full px-3 py-0.5 text-[10px] font-black bg-white">
                          SYSTEM
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-stone-400 italic">No activity logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
