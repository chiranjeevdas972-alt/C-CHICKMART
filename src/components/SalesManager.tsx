import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ShoppingCart, ReceiptText, DollarSign } from 'lucide-react';

export default function SalesManager() {
  const [sales, setSales] = useState<any[]>([]);
  const [newSale, setNewSale] = useState({
    item: '',
    quantity: 0,
    price: 0,
    customerName: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sales'));
    return () => unsub();
  }, []);

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSale.item || newSale.quantity <= 0 || newSale.price <= 0) return;
    
    const total = newSale.quantity * newSale.price;
    try {
      await addDoc(collection(db, 'sales'), {
        ...newSale,
        total,
        timestamp: new Date().toISOString()
      });
      setNewSale({ item: '', quantity: 0, price: 0, customerName: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sales');
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <Card className="rounded-3xl border-stone-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
              New Sale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSale} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Item Details</label>
                <Input 
                  placeholder="Item (e.g. Whole Chicken)" 
                  value={newSale.item}
                  onChange={e => setNewSale({...newSale, item: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Quantity (kg/pcs)</label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={newSale.quantity || ''}
                    onChange={e => setNewSale({...newSale, quantity: Number(e.target.value)})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Price per Unit</label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={newSale.price || ''}
                    onChange={e => setNewSale({...newSale, price: Number(e.target.value)})}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Customer Name (Optional)</label>
                <Input 
                  placeholder="Guest Customer" 
                  value={newSale.customerName}
                  onChange={e => setNewSale({...newSale, customerName: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div className="pt-4 border-t border-stone-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-stone-500">Total Amount</span>
                  <span className="text-2xl font-bold text-stone-900">
                    ${(newSale.quantity * newSale.price).toFixed(2)}
                  </span>
                </div>
                <Button type="submit" className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white h-12 font-bold">
                  Complete Sale
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <Card className="rounded-3xl border-stone-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-stone-50 border-b border-stone-100">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-stone-600" />
              Recent Sales
            </CardTitle>
          </CardHeader>
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.item}</TableCell>
                    <TableCell>{sale.quantity}</TableCell>
                    <TableCell className="font-bold text-green-700">${sale.total.toFixed(2)}</TableCell>
                    <TableCell className="text-stone-500 text-xs">
                      {new Date(sale.timestamp).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-stone-400">
                      No sales recorded today
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
