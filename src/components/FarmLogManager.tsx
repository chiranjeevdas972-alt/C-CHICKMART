import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, ensureVerified } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { History, AlertTriangle, Syringe, Utensils, Sparkles } from 'lucide-react';

export default function FarmLogManager({ profile }: { profile: any }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [newLog, setNewLog] = useState({
    type: 'feeding',
    details: '',
    count: 0
  });

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'farmlogs'), 
      where('ownerId', '==', profile.uid),
      orderBy('timestamp', 'desc'), 
      limit(50)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'farmlogs'));
    return () => unsub();
  }, [profile]);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to record activity logs.");
        return;
      }
      await addDoc(collection(db, 'farmlogs'), {
        ...newLog,
        ownerId: profile.uid,
        timestamp: new Date().toISOString()
      });
      setNewLog({ type: 'feeding', details: '', count: 0 });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'farmlogs');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'mortality': return <AlertTriangle className="text-red-500" size={18} />;
      case 'vaccination': return <Syringe className="text-blue-500" size={18} />;
      case 'feeding': return <Utensils className="text-orange-500" size={18} />;
      case 'cleaning': return <Sparkles className="text-green-500" size={18} />;
      default: return <History size={18} />;
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card className="rounded-3xl border-stone-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Log Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddLog} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-500 uppercase">Activity Type</label>
                <Select value={newLog.type} onValueChange={val => setNewLog({...newLog, type: val})}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feeding">Feeding</SelectItem>
                    <SelectItem value="mortality">Mortality (Loss)</SelectItem>
                    <SelectItem value="vaccination">Vaccination</SelectItem>
                    <SelectItem value="cleaning">Cleaning/Sanitation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-500 uppercase">Count (if applicable)</label>
                <Input 
                  type="number" 
                  value={newLog.count || ''}
                  onChange={e => setNewLog({...newLog, count: Number(e.target.value)})}
                  className="rounded-xl"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-500 uppercase">Details</label>
                <textarea 
                  className="w-full min-h-[100px] rounded-xl border border-stone-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                  placeholder="Add notes about this activity..."
                  value={newLog.details}
                  onChange={e => setNewLog({...newLog, details: e.target.value})}
                />
              </div>
              <Button type="submit" className="w-full rounded-xl bg-stone-900 text-white hover:bg-stone-800 h-12">
                Save Log
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex gap-4 items-start">
              <div className="p-3 bg-stone-50 rounded-xl">
                {getIcon(log.type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold capitalize">{log.type}</h4>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                {log.count > 0 && (
                  <Badge variant="secondary" className="mb-2 rounded-full px-2 py-0 text-[10px]">
                    Count: {log.count}
                  </Badge>
                )}
                <p className="text-sm text-stone-600 leading-relaxed">{log.details || 'No additional details provided.'}</p>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200 text-stone-400">
              No activity logs yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
