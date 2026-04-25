import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Trash2, Plus, Package } from 'lucide-react';

export default function InventoryManager() {
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    name: '',
    type: 'bird',
    quantity: 0,
    unit: 'pcs'
  });

  useEffect(() => {
    const q = query(collection(db, 'inventory'));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'inventory'));
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || newItem.quantity <= 0) return;
    try {
      await addDoc(collection(db, 'inventory'), {
        ...newItem,
        lastUpdated: new Date().toISOString()
      });
      setNewItem({ name: '', type: 'bird', quantity: 0, unit: 'pcs' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'inventory');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `inventory/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-stone-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-orange-600" />
            Add New Item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <Input 
                placeholder="Item Name (e.g. Broiler Chicks)" 
                value={newItem.name}
                onChange={e => setNewItem({...newItem, name: e.target.value})}
                className="rounded-xl"
              />
            </div>
            <Select value={newItem.type} onValueChange={val => setNewItem({...newItem, type: val})}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bird">Birds</SelectItem>
                <SelectItem value="feed">Feed</SelectItem>
                <SelectItem value="medicine">Medicine</SelectItem>
                <SelectItem value="egg">Eggs</SelectItem>
                <SelectItem value="meat">Meat</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Qty" 
                value={newItem.quantity || ''}
                onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})}
                className="rounded-xl"
              />
              <Input 
                placeholder="Unit" 
                value={newItem.unit}
                onChange={e => setNewItem({...newItem, unit: e.target.value})}
                className="rounded-xl w-20"
              />
            </div>
            <Button type="submit" className="rounded-xl bg-stone-900 text-white hover:bg-stone-800">
              Add Item
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-stone-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-stone-50">
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize rounded-full px-3">
                    {item.type}
                  </Badge>
                </TableCell>
                <TableCell>{item.quantity} {item.unit}</TableCell>
                <TableCell className="text-stone-500 text-xs">
                  {new Date(item.lastUpdated).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(item.id)}
                    className="text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-stone-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  No items in inventory
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
