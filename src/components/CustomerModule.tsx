import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, increment, where, getDocs } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Users, Phone, MapPin, CreditCard, Plus, Search, ArrowLeft, History } from 'lucide-react';
import { Badge } from './ui/badge';
import { format } from 'date-fns';

export default function CustomerModule({ action, onActionComplete }: { action?: string | null, onActionComplete?: () => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedHistoryCust, setSelectedHistoryCust] = useState<any>(null);
  const [customerSales, setCustomerSales] = useState<any[]>([]);

  useEffect(() => {
    if (action === 'add-cust') {
      setIsAddOpen(true);
      onActionComplete?.();
    }
  }, [action]);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    creditBalance: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'customers'));
    return () => unsub();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'customers'), {
        ...newCustomer,
        history: [],
        createdAt: new Date().toISOString()
      });
      setIsAddOpen(false);
      setNewCustomer({ name: '', phone: '', address: '', creditBalance: 0 });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'customers');
    }
  };

  const fetchCustomerHistory = async (customer: any) => {
    try {
      const q = query(collection(db, 'sales'), where('customerId', '==', customer.id), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setCustomerSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSelectedHistoryCust(customer);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'sales');
    }
  };
  const handleSettleDues = async (customerId: string, currentBalance: number) => {
    const amount = prompt(`Enter amount to pay (Current Dues: ₹${currentBalance})`, currentBalance.toString());
    if (!amount || isNaN(Number(amount))) return;
    
    const payment = Number(amount);
    if (payment <= 0) return;

    try {
      const custRef = doc(db, 'customers', customerId);
      await updateDoc(custRef, {
        creditBalance: increment(-payment)
      });
      // Optionally log this as an "Income" transaction in accounts
      await addDoc(collection(db, 'sales'), {
        invoiceNo: `PYMT-${Date.now().toString().slice(-6)}`,
        items: [{ name: 'Credit Payment', total: payment, quantity: 1, unit: 'pcs' }],
        total: payment,
        paymentStatus: 'paid',
        customerId,
        customerName: customers.find(c => c.id === customerId)?.name || 'Unknown',
        timestamp: new Date().toISOString(),
        type: 'payment'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `customers/${customerId}`);
    }
  };

  if (selectedHistoryCust) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedHistoryCust(null)} className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h3 className="text-xl font-bold">{selectedHistoryCust.name}'s History</h3>
            <p className="text-sm text-stone-500">{selectedHistoryCust.phone}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 rounded-[2rem] bg-orange-50 border-orange-100">
            <p className="text-[10px] font-black uppercase text-orange-400 tracking-widest">Total Sales</p>
            <p className="text-2xl font-black text-orange-900 mt-1">{customerSales.length}</p>
          </Card>
          <Card className="p-6 rounded-[2rem] bg-green-50 border-green-100">
            <p className="text-[10px] font-black uppercase text-green-400 tracking-widest">Revenue Generated</p>
            <p className="text-2xl font-black text-green-900 mt-1">₹{customerSales.reduce((sum, s) => sum + (s.total || 0), 0).toLocaleString()}</p>
          </Card>
          <Card className="p-6 rounded-[2rem] bg-red-50 border-red-100">
            <p className="text-[10px] font-black uppercase text-red-400 tracking-widest">Current Dues</p>
            <p className="text-2xl font-black text-red-900 mt-1">₹{selectedHistoryCust.creditBalance.toLocaleString()}</p>
          </Card>
        </div>

        <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="text-stone-500">{format(new Date(sale.timestamp), 'MMM dd, p')}</TableCell>
                  <TableCell className="font-mono text-xs">{sale.invoiceNo}</TableCell>
                  <TableCell>
                    <p className="text-xs text-stone-600 truncate max-w-[200px]">
                      {sale.items.map((i: any) => `${i.name} x ${i.quantity}`).join(', ')}
                    </p>
                  </TableCell>
                  <TableCell className="font-bold text-stone-900">₹{sale.total}</TableCell>
                  <TableCell>
                    <Badge variant={sale.paymentStatus === 'paid' ? 'outline' : 'destructive'} className="rounded-full">
                      {sale.paymentStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {customerSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-stone-400 italic">No transactions found for this customer.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Users className="text-orange-600" />
          Customer Database
        </h3>
        <Button onClick={() => setIsAddOpen(true)} className="rounded-xl bg-stone-900 text-white">
          <Plus size={18} className="mr-2" />
          Add Customer
        </Button>
      </div>

      <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-stone-50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Udhaar Balance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((cust) => (
              <TableRow key={cust.id}>
                <TableCell className="font-bold">{cust.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-stone-500">
                    <Phone size={14} />
                    {cust.phone}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-stone-500 max-w-[200px] truncate">
                    <MapPin size={14} />
                    {cust.address}
                  </div>
                </TableCell>
                <TableCell>
                  {cust.creditBalance > 0 ? (
                    <Badge className="bg-red-100 text-red-700 font-bold">
                      ₹{cust.creditBalance.toLocaleString()}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-stone-400">No Dues</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-stone-600 font-bold rounded-lg border-stone-200"
                    onClick={() => handleSettleDues(cust.id, cust.creditBalance)}
                    disabled={cust.creditBalance === 0}
                  >
                    Settle Dues
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-orange-600 font-bold"
                    onClick={() => fetchCustomerHistory(cust)}
                  >
                    View History
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-[2rem] shadow-2xl">
            <CardHeader>
              <CardTitle>Register New Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Full Name</label>
                  <Input 
                    required 
                    className="h-12 rounded-2xl" 
                    value={newCustomer.name} 
                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Phone Number</label>
                  <Input 
                    required 
                    type="tel"
                    className="h-12 rounded-2xl" 
                    value={newCustomer.phone} 
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Address</label>
                  <Input 
                    className="h-12 rounded-2xl" 
                    value={newCustomer.address} 
                    onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="flex-1 rounded-2xl h-12">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-stone-900 text-white rounded-2xl h-12">Register</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
