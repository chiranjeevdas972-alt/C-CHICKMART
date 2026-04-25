import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Plus, Package, AlertTriangle, ArrowRightLeft, Warehouse, Trash2, History } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { format } from 'date-fns';

export default function InventoryModule() {
  const [items, setItems] = useState<any[]>([]);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    type: 'live_bird',
    quantity: 0,
    price: 0,
    unit: 'pcs',
    lowStockThreshold: 10,
    locationType: 'farm'
  });

  useEffect(() => {
    const q = query(collection(db, 'inventory'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'inventory'));
    return () => unsub();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'inventory'), {
        ...newItem,
        locationId: 'default', // In real app, select farm/shop ID
        createdAt: new Date().toISOString()
      });
      setIsAddItemOpen(false);
      setNewItem({
        name: '',
        type: 'live_bird',
        quantity: 0,
        price: 0,
        unit: 'pcs',
        lowStockThreshold: 10,
        locationType: 'farm'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'inventory');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `inventory/${id}`);
    }
  };

  const updateStock = async (itemId: string, delta: number) => {
    try {
      const itemRef = doc(db, 'inventory', itemId);
      const itemIdx = items.findIndex(i => i.id === itemId);
      const currentItem = items[itemIdx];
      const newQty = currentItem.quantity + delta;

      await updateDoc(itemRef, {
        quantity: increment(delta)
      });

      // Stock alert logic
      if (newQty <= (currentItem.lowStockThreshold || 0)) {
        await notificationService.notify('admin', {
          title: 'Low Stock Alert',
          message: `${currentItem.name} is low on stock (${newQty} ${currentItem.unit} left)`,
          type: 'warning',
          category: 'stock'
        });
      }

      // Log movement activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'stock_movement',
        itemId,
        itemName: currentItem.name,
        delta,
        newQty,
        timestamp: new Date().toISOString(),
        userId: 'system'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${itemId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Package className="text-orange-600" />
          Inventory Stock
        </h3>
        <div className="flex gap-2">
          <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
            <DialogTrigger
              render={
                <Button className="rounded-xl bg-stone-900 text-white shadow-sm">
                  <Plus size={18} className="mr-2" />
                  Add Item
                </Button>
              }
            />
            <DialogContent className="rounded-3xl">
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddItem} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Item Name</Label>
                  <Input 
                    required 
                    value={newItem.name} 
                    onChange={e => setNewItem({...newItem, name: e.target.value})} 
                    placeholder="e.g. Starter Feed, Broiler Bird"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select 
                      className="w-full h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm"
                      value={newItem.type}
                      onChange={e => setNewItem({...newItem, type: e.target.value})}
                    >
                      <option value="live_bird">Live Bird</option>
                      <option value="dressed_chicken">Dressed Chicken</option>
                      <option value="egg">Egg</option>
                      <option value="feed">Feed</option>
                      <option value="medicine">Medicine</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <select 
                      className="w-full h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm"
                      value={newItem.locationType}
                      onChange={e => setNewItem({...newItem, locationType: e.target.value})}
                    >
                      <option value="farm">Farm</option>
                      <option value="shop">Shop</option>
                      <option value="cold_storage">Cold Storage</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input 
                      type="number" 
                      required 
                      value={newItem.quantity || ''} 
                      onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Low Alert Threshold</Label>
                    <Input 
                      type="number" 
                      required 
                      value={newItem.lowStockThreshold || ''} 
                      onChange={e => setNewItem({...newItem, lowStockThreshold: Number(e.target.value)})} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input 
                      required 
                      value={newItem.unit} 
                      onChange={e => setNewItem({...newItem, unit: e.target.value})} 
                      placeholder="kg, pcs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Selling Price (₹)</Label>
                    <Input 
                      type="number" 
                      required 
                      value={newItem.price || ''} 
                      onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} 
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-stone-900 text-white rounded-xl h-12">
                  Add to Inventory
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <Card key={item.id} className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="bg-stone-50 border-b border-stone-100 pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold tracking-wider">{item.type.replace('_', ' ')}</CardDescription>
                </div>
                <Badge variant={item.quantity <= (item.lowStockThreshold || 0) ? 'destructive' : 'outline'} className="rounded-full">
                  {item.quantity <= (item.lowStockThreshold || 0) ? 'Low Stock' : 'In Stock'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              <div className="flex justify-between items-end mb-4">
                <div className="flex items-center gap-2 text-stone-400">
                  <Warehouse size={14} />
                  <span className="text-xs font-bold uppercase tracking-tight">{item.locationType}</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-stone-900 leading-none">{item.quantity}</span>
                  <span className="text-xs font-bold text-stone-400 ml-1">{item.unit}</span>
                  <p className="text-[10px] font-bold text-green-600 mt-1">₹{item.price}/{item.unit}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-1 bg-stone-50 rounded-2xl border border-stone-100">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => updateStock(item.id, -1)}
                  className="flex-1 h-10 rounded-xl hover:bg-white hover:text-red-600 hover:shadow-sm"
                >
                  -
                </Button>
                <div className="w-px h-6 bg-stone-200" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => updateStock(item.id, 1)}
                  className="flex-1 h-10 rounded-xl hover:bg-white hover:text-green-600 hover:shadow-sm"
                >
                  +
                </Button>
                <div className="w-px h-6 bg-stone-200" />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => deleteItem(item.id)}
                  className="h-10 w-10 text-stone-300 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
