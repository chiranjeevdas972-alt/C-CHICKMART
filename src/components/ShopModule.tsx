import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, ensureVerified } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, getDoc, updateDoc, increment, getDocs, where, writeBatch } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ShoppingCart, ReceiptText, UserPlus, Printer, Trash2, Search, MessageSquare, Percent, XCircle, History } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { shopUtils } from '../lib/shopUtils';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const UNIT_FACTORS: Record<string, number> = {
  'kg': 1,
  'gram': 0.001,
  'quintal': 100,
  'pcs': 1,
  'egg': 1,
  'set': 1
};

export default function ShopModule({ action, onActionComplete, profile }: { action?: string | null, onActionComplete?: () => void, profile?: any }) {
  const { t } = useTranslation();
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    if (action === 'new-sale') {
      setCart([]);
      setSelectedCustomer(null);
      setSearchPhone('');
      setTimeout(() => onActionComplete?.(), 0);
    }
  }, [action]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchPhone, setSearchPhone] = useState('');
  const [sales, setSales] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [discount, setDiscount] = useState({ type: 'percentage', value: 0 });
  const [gstEnabled, setGstEnabled] = useState(true);
  const gstRate = 0.05; // 5% GST
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isNewCustOpen, setIsNewCustOpen] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', address: '' });
  
  const [itemInput, setItemInput] = useState({
    name: '',
    itemId: '',
    quantity: '' as any,
    price: '' as any,
    unit: 'kg'
  });
  const [printerSize, setPrinterSize] = useState<'standard' | '3inch' | '4inch'>('standard');

  const getTaxBreakdown = (sale: any) => {
    const cgst = (sale.gstAmount || 0) / 2;
    const sgst = (sale.gstAmount || 0) / 2;
    return { cgst, sgst, igst: 0 };
  };

  useEffect(() => {
    if (!profile) return;

    const qSales = query(collection(db, 'sales'), where('ownerId', '==', profile.uid), limit(10));
    const unsubSales = onSnapshot(qSales, (snap) => {
      const sortedSales = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setSales(sortedSales);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'sales'));

    const qInv = query(collection(db, 'inventory'), where('ownerId', '==', profile.uid));
    const unsubInv = onSnapshot(qInv, (snap) => {
      setInventoryItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'inventory'));

    return () => { unsubSales(); unsubInv(); };
  }, [profile]);

  const addToCart = () => {
    if (!itemInput.itemId || !itemInput.quantity || !itemInput.price) return;
    
    const qty = Number(itemInput.quantity);
    const price = Number(itemInput.price);
    
    const invItem = inventoryItems.find(i => i.id === itemInput.itemId);
    if (!invItem) return;

    const inputFactor = UNIT_FACTORS[itemInput.unit.toLowerCase()] || 1;
    const baseFactor = UNIT_FACTORS[invItem.unit.toLowerCase()] || 1;
    const baseQuantity = qty * (inputFactor / baseFactor);

    if (baseQuantity > invItem.quantity) {
      alert(t('insufficient_stock', { count: invItem.quantity, unit: invItem.unit }));
      return;
    }

    const total = Number((baseQuantity * price).toFixed(2));
    setCart([...cart, { 
      ...itemInput, 
      quantity: baseQuantity,
      displayQuantity: qty,
      displayUnit: itemInput.unit,
      price: price,
      total, 
      id: Date.now(), 
      originalItem: invItem 
    }]);
    setItemInput({ name: '', itemId: '', quantity: '' as any, price: '' as any, unit: 'kg' });
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = shopUtils.calculateDiscount(cartTotal, discount.type as any, discount.value);
  const taxableAmount = cartTotal - discountAmount;
  const gstAmount = gstEnabled ? taxableAmount * gstRate : 0;
  const finalTotal = taxableAmount + gstAmount;

  const shareToWhatsApp = (sale: any) => {
    const itemsList = sale.items.map((i: any) => `${i.name} (${i.quantity}${i.unit})`).join(', ');
    const message = `*ChickMart Invoice*\n\nInvoice: ${sale.invoiceNo}\nCustomer: ${sale.customerName}\nItems: ${itemsList}\nTotal: ₹${sale.total}\n\nThank you for shopping with ChickMart!`;
    const url = `https://wa.me/${sale.customerPhone || ''}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSearchCustomer = async () => {
    if (!searchPhone || !profile) return;
    try {
      const q = query(collection(db, 'customers'), where('ownerId', '==', profile.uid), where('phone', '==', searchPhone));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const found = snap.docs[0];
        setSelectedCustomer({ id: found.id, ...found.data() });
      } else {
        setIsNewCustOpen(true);
        setNewCust({ ...newCust, phone: searchPhone });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'customers');
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to register customers.");
        return;
      }
      const docRef = await addDoc(collection(db, 'customers'), {
        ...newCust,
        ownerId: profile?.uid || 'unknown',
        creditBalance: 0,
        createdAt: new Date().toISOString()
      });
      setSelectedCustomer({ id: docRef.id, ...newCust, creditBalance: 0 });
      setIsNewCustOpen(false);
      setNewCust({ name: '', phone: '', address: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'customers');
    }
  };

  const completeSale = async (paymentStatus: 'paid' | 'credit') => {
    if (cart.length === 0) return;

    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to complete sales.");
        return;
      }
      if (!profile) {
        alert("Please wait for profile to load.");
        return;
      }
      const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
      const saleData: any = {
        invoiceNo,
        items: cart,
        cartTotal,
        taxableAmount,
        gstAmount,
        total: finalTotal,
        paymentStatus,
        customerId: selectedCustomer?.id || 'guest',
        customerName: selectedCustomer?.name || 'Guest',
        customerPhone: selectedCustomer?.phone || '',
        ownerId: profile?.uid || 'unknown',
        timestamp: new Date().toISOString()
      };
      const batch = writeBatch(db);

      // Create Sale Record
      const saleRef = doc(collection(db, 'sales'));
      batch.set(saleRef, saleData);
      
      // Update Customer Credit
      if (paymentStatus === 'credit' && selectedCustomer) {
        const custRef = doc(db, 'customers', selectedCustomer.id);
        batch.update(custRef, {
          creditBalance: increment(cartTotal)
        });
      }

      // Update Inventory Stock
      cart.forEach(item => {
        const itemRef = doc(db, 'inventory', item.itemId);
        batch.update(itemRef, {
          quantity: increment(-item.quantity)
        });
      });

      await batch.commit();

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'new_sale',
        invoiceNo,
        amount: finalTotal,
        ownerId: profile?.uid || 'unknown',
        timestamp: new Date().toISOString(),
        userId: profile?.uid || 'unknown',
        userName: profile?.name || 'System'
      });
      console.log('PDF Generated');

      generatePDF({...saleData, total: finalTotal});
      setCart([]);
      setSelectedCustomer(null);
      setSearchPhone('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'sales-transaction');
    }
  };

  const cancelSale = async (sale: any) => {
    if (!confirm('Are you sure you want to cancel this sale? This will revert stock and credit.')) return;
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified.");
        return;
      }
      const batch = writeBatch(db);
      
      // Mark sale as cancelled
      const saleRef = doc(db, 'sales', sale.id);
      batch.update(saleRef, { status: 'cancelled', updatedAt: new Date().toISOString() });

      // Revert stock
      sale.items.forEach((item: any) => {
        const itemRef = doc(db, 'inventory', item.itemId);
        batch.update(itemRef, { quantity: increment(item.quantity) });
      });

      // Revert customer credit
      if (sale.paymentStatus === 'credit' && sale.customerId !== 'guest') {
        const custRef = doc(db, 'customers', sale.customerId);
        batch.update(custRef, { creditBalance: increment(-sale.total) });
      }

      await batch.commit();

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'sale_cancelled',
        invoiceNo: sale.invoiceNo,
        amount: sale.total,
        ownerId: profile?.uid || 'unknown',
        timestamp: new Date().toISOString(),
        userId: profile?.uid || 'unknown',
        userName: profile?.name || 'System'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'cancel-sale');
    }
  };
  const generatePDF = (sale: any) => {
    const isThermal = printerSize !== 'standard';
    const width = printerSize === '3inch' ? 80 : (printerSize === '4inch' ? 104 : 210);
    const doc = new jsPDF({
      unit: 'mm',
      format: isThermal ? [width, 250] : 'a4'
    }) as any;

    const { cgst, sgst } = getTaxBreakdown(sale);
    const centerX = width / 2;
    const margin = isThermal ? 5 : 20;
    const fontSizeBase = isThermal ? 8 : 9;
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isThermal ? 14 : 18);
    doc.text('CHICKMART', centerX, level(15), { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSizeBase);
    doc.text('Digwadih, Dhanbad, Jharkhand, 828113', centerX, level(22), { align: 'center' });
    doc.text('chiranjeev972@gmail.com', centerX, level(27), { align: 'center' });
    doc.text(`Contact No: ${profile?.businessPhone || '8987766981'}`, centerX, level(32), { align: 'center' });
    
    doc.setDrawColor(200);
    doc.line(margin, level(35), width - margin, level(35));
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isThermal ? 10 : 12);
    doc.text('TAX INVOICE', centerX, level(42), { align: 'center' });
    doc.line(margin, level(45), width - margin, level(45));

    // Bill Info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSizeBase);
    let billY = 52;
    doc.text(`Invoice No.: ${sale.invoiceNo}`, margin, level(billY));
    doc.text(`Bill Date: ${format(new Date(sale.timestamp), 'dd/MM/yyyy')}`, margin, level(billY + 5));
    doc.text(`Time: ${format(new Date(sale.timestamp), 'HH:mm')}`, width - margin, level(billY + 5), { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('Name and Address :', margin, level(billY + 13));
    doc.setFont('helvetica', 'normal');
    doc.text(`${sale.customerName}`, margin, level(billY + 18));
    if (sale.customerPhone) doc.text(`${sale.customerPhone}`, margin, level(billY + 23));

    function level(val: number) { return val; }

    // Table
    const tableHeaders = isThermal 
      ? [['Item', 'Qty', 'Rate', 'Total']]
      : [['S.No', 'Product Name', 'Qty', 'Rate', 'Disc', 'Tax%', 'Total']];
      
    const tableData = sale.items.map((item: any, idx: number) => isThermal 
      ? [item.name, `${item.displayQuantity || item.quantity} ${item.displayUnit || item.unit}`, item.price.toFixed(2), item.total.toFixed(2)]
      : [idx + 1, item.name, `${item.displayQuantity || item.quantity} ${item.displayUnit || item.unit}`, item.price.toFixed(2), '0', sale.gstAmount > 0 ? '5%' : '0%', item.total.toFixed(2)]
    );

    doc.autoTable({
      startY: billY + (sale.customerPhone ? 28 : 23),
      head: tableHeaders,
      body: tableData,
      theme: 'plain',
      headStyles: { fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0], fontSize: fontSizeBase - 1 },
      bodyStyles: { lineWidth: 0.1, lineColor: [200, 200, 200], fontSize: fontSizeBase - 1 },
      margin: { left: margin, right: margin }
    });

    const tableFinalY = doc.lastAutoTable.finalY + 5;
    
    // Summary
    doc.setFontSize(fontSizeBase);
    doc.setFont('helvetica', 'bold');
    doc.text(`Items: ${sale.items.length}`, margin, tableFinalY);
    doc.text(`Qty: ${sale.items.reduce((s: number, i: any) => s + i.quantity, 0)}`, margin + (isThermal ? 20 : 40), tableFinalY);
    doc.text(`${sale.total.toFixed(2)}`, width - margin, tableFinalY, { align: 'right' });
    doc.setDrawColor(200);
    doc.line(margin, tableFinalY + 2, width - margin, tableFinalY + 2);

    const summY = tableFinalY + 8;
    doc.setFont('helvetica', 'normal');
    doc.text('Sub Total', margin, summY);
    doc.text(`${sale.cartTotal.toFixed(2)}`, width - margin, summY, { align: 'right' });
    
    doc.text('Item Discount', margin, summY + 4);
    doc.text(`0.00`, width - margin, summY + 4, { align: 'right' });

    doc.text('Round Off (+,-) :', margin, summY + 8);
    doc.text(`0.00`, width - margin, summY + 8, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('Bill Amount:', margin, summY + 14);
    doc.text(`${sale.total.toFixed(2)}`, width - margin, summY + 14, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.text('Payment :', margin, summY + 19);
    doc.text(`${sale.total.toFixed(2)}`, width - margin, summY + 19, { align: 'right' });
    doc.line(margin, summY + 21, width - margin, summY + 21);

    doc.text(`Paid By Cash : ${sale.total.toFixed(2)}`, margin, summY + 27);
    doc.line(margin, summY + 29, width - margin, summY + 29);

    // Tax Table logic
    if (sale.gstAmount > 0) {
      const taxY = summY + 35 ;
      const taxHeaders = [['Tax%', 'SGST', 'CGST', 'Total']];
      const taxRow = [['5%', sgst.toFixed(2), cgst.toFixed(2), sale.total.toFixed(2)]];
      
      doc.autoTable({
        startY: taxY,
        head: taxHeaders,
        body: taxRow,
        theme: 'grid',
        styles: { fontSize: fontSizeBase - 2, halign: 'center' },
        margin: { left: margin, right: margin }
      });
    }

    const footY = isThermal ? doc.lastAutoTable.finalY + 15 : 275;
    doc.setFontSize(fontSizeBase);
    doc.setFont('helvetica', 'bold');
    doc.text('THANK YOU FOR SHOPPING!', centerX, footY, { align: 'center' });
    doc.text('VISIT AGAIN !', centerX, footY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isThermal ? 6 : 7);
    doc.text('Software By : C Vidya ChickMart , +91 8987766981', centerX, footY + 10, { align: 'center' });

    doc.save(`Invoice_${sale.invoiceNo}.pdf`);
  };

  const sendWhatsAppAlert = (sale: any) => {
    const text = `Bill Summary: ${profile?.businessName}\nInvoice: ${sale.invoiceNo}\nTotal: ₹${sale.total}\nThank you!`;
    const url = `https://wa.me/${sale.customerPhone || ''}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* POS Interface */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="rounded-[2rem] border-stone-200 shadow-sm">
          <CardHeader className="border-b border-stone-100">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="text-orange-600" />
              {t('pos')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Customer Selection */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <Input 
                  placeholder={t('phone')} 
                  className="pl-10 rounded-xl"
                  value={searchPhone}
                  onChange={e => setSearchPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchCustomer()}
                />
              </div>
              <Button variant="outline" className="rounded-xl px-6" onClick={handleSearchCustomer}>{t('search') || 'Search'}</Button>
              <Dialog open={isNewCustOpen} onOpenChange={setIsNewCustOpen}>
                <DialogTrigger
                  render={
                    <Button variant="outline" className="rounded-xl gap-2">
                      <UserPlus size={18} />
                      New
                    </Button>
                  }
                />
                <DialogContent className="rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Register New Customer</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddCustomer} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input required value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} className="rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input required value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} className="rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input value={newCust.address} onChange={e => setNewCust({...newCust, address: e.target.value})} className="rounded-xl h-12" />
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl bg-stone-900 text-white">Save & Select</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {selectedCustomer && (
              <div className="p-3 bg-orange-50 rounded-xl flex justify-between items-center border border-orange-100">
                <div>
                  <p className="text-xs font-bold text-orange-400 uppercase">Selected Customer</p>
                  <p className="font-bold text-orange-900">{selectedCustomer.name} ({selectedCustomer.phone})</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)} className="text-orange-600 hover:bg-orange-100">Change</Button>
              </div>
            )}

            {/* Quick Select Buttons */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {['all', 'bird', 'chicken', 'feed', 'other'].map(cat => (
                  <Button 
                    key={cat} 
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="xs"
                    className="rounded-full px-4 capitalize h-8"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                {inventoryItems
                  .filter(item => selectedCategory === 'all' || item.type.toLowerCase().includes(selectedCategory))
                  .map(item => (
                <Button 
                  key={item.id} 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full px-4 h-9 bg-white border-stone-200 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all font-medium text-xs flex-shrink-0"
                  onClick={() => {
                    setItemInput({
                      ...itemInput,
                      itemId: item.id,
                      name: item.name,
                      unit: item.unit,
                      price: item.price || (item.type.includes('bird') ? 220 : 150)
                    });
                  }}
                >
                  {item.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Item Input */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-stone-50 rounded-2xl">
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold uppercase text-stone-400 mb-1 block">{t('item')}</label>
                <select 
                  className="w-full h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm"
                  value={itemInput.itemId}
                  onChange={e => {
                    const itm = inventoryItems.find(i => i.id === e.target.value);
                    if (itm) {
                      setItemInput({
                        ...itemInput, 
                        itemId: itm.id, 
                        name: itm.name,
                        unit: itm.unit,
                        price: itm.price || (itm.type?.includes('bird') ? 220 : 150)
                      });
                    }
                  }}
                >
                  <option value="">{t('select_product') || 'Select Product...'}</option>
                  {inventoryItems.filter(i => i.locationType === 'shop' || i.type?.includes('chicken')).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
                {inventoryItems.length === 0 && (
                  <p className="text-[10px] text-orange-600 font-bold mt-1">Hint: Add shop items in 'Inventory' first</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-stone-400 mb-1 block">{t('quantity')}</label>
                <div className="relative">
                  <Input 
                    type="number" 
                    step="0.001"
                    placeholder="0.000"
                    className="rounded-xl pr-20" 
                    value={itemInput.quantity} 
                    onChange={e => setItemInput({...itemInput, quantity: e.target.value})}
                  />
                  <select 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 rounded-lg border-none bg-stone-100 px-2 text-[10px] font-bold outline-none cursor-pointer"
                    value={itemInput.unit}
                    onChange={e => setItemInput({...itemInput, unit: e.target.value})}
                  >
                    <option value="kg">KG</option>
                    <option value="gram">GRAM</option>
                    <option value="quintal">QUINTAL</option>
                    <option value="pcs">PCS</option>
                    <option value="egg">EGG</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-stone-400 mb-1 block">{t('price')}</label>
                <Input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  className="rounded-xl" 
                  value={itemInput.price} 
                  onChange={e => setItemInput({...itemInput, price: e.target.value})}
                />
              </div>
              <div className="flex flex-col justify-end">
                {itemInput.itemId && itemInput.quantity && itemInput.price && (
                  <div className="text-[10px] font-bold text-orange-600 mb-1 ml-1">
                    Subtotal: ₹{(() => {
                      const qty = Number(itemInput.quantity);
                      const price = Number(itemInput.price);
                      const inputFactor = UNIT_FACTORS[itemInput.unit.toLowerCase()] || 1;
                      const invItem = inventoryItems.find(i => i.id === itemInput.itemId);
                      const baseFactor = invItem ? (UNIT_FACTORS[invItem.unit.toLowerCase()] || 1) : 1;
                      const baseQty = qty * (inputFactor / baseFactor);
                      return (baseQty * price).toFixed(2);
                    })()}
                  </div>
                )}
                <Button onClick={addToCart} disabled={!itemInput.itemId} className="w-full rounded-xl bg-orange-600 text-white hover:bg-orange-700 h-10">{t('add') || 'Add'}</Button>
              </div>
            </div>

            {/* Discount & GST Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-widest whitespace-nowrap">
                  <Printer size={16} />
                  Printer
                </div>
                <div className="flex flex-wrap gap-2 flex-1">
                  {['standard', '3inch', '4inch'].map(size => (
                    <Button 
                      key={size}
                      variant={printerSize === size ? 'default' : 'outline'}
                      size="xs"
                      className="rounded-full px-3 capitalize h-8 text-[10px]"
                      onClick={() => setPrinterSize(size as any)}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>

              <div 
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${gstEnabled ? 'bg-orange-600 border-orange-700 text-white shadow-lg shadow-orange-100' : 'bg-stone-50 border-stone-200 text-stone-400'}`}
                onClick={() => setGstEnabled(!gstEnabled)}
              >
                <div className="flex items-center gap-3">
                  <ReceiptText size={20} className={gstEnabled ? 'text-white' : 'text-stone-300'} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest leading-none">GST Active</p>
                    <p className={`text-[10px] mt-1 ${gstEnabled ? 'text-orange-100' : 'text-stone-400'}`}>GST Invoicing Ready (5%)</p>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full relative transition-colors ${gstEnabled ? 'bg-white/20' : 'bg-stone-200'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${gstEnabled ? 'left-5' : 'left-1'}`} />
                </div>
              </div>
            </div>

            {/* Cart Table */}
            <div className="border rounded-2xl overflow-hidden overflow-x-auto">
              <div className="min-w-[500px]">
                <Table>
                  <TableHeader className="bg-stone-50">
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.displayQuantity || item.quantity} {item.displayUnit || item.unit}</TableCell>
                        <TableCell>₹{item.price}</TableCell>
                        <TableCell className="font-bold">₹{item.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)} className="text-stone-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {cart.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-stone-400">Cart is empty</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checkout Sidebar */}
      <div className="space-y-6">
        <Card className="rounded-[2rem] border-stone-200 shadow-sm bg-stone-900 text-white">
          <CardHeader>
            <CardTitle className="text-stone-400 text-sm font-bold uppercase tracking-widest">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-400">Taxable Amount</span>
                <span>₹{taxableAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">GST (5%)</span>
                <span>₹{gstAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-end pt-4 border-t border-stone-800">
              <span className="text-stone-400">Grand Total</span>
              <span className="text-4xl font-bold">₹{finalTotal.toLocaleString()}</span>
            </div>
            
            <div className="space-y-3 pt-6 border-t border-stone-800">
              <Button 
                onClick={() => completeSale('paid')} 
                className="w-full h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg"
              >
                {t('complete_sale')}
              </Button>
              <Button 
                onClick={() => completeSale('credit')} 
                variant="outline" 
                className="w-full h-14 rounded-2xl border-stone-700 hover:bg-stone-800 text-white font-bold disabled:opacity-50 disabled:bg-stone-800/50 disabled:text-stone-400 disabled:border-stone-800"
                disabled={!selectedCustomer}
              >
                {t('udhaar')}
              </Button>
            </div>
            {!selectedCustomer && (
              <p className="text-[10px] text-center text-stone-500 italic">Select a customer to enable Udhaar tracking</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-stone-50 border-b border-stone-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <History size={16} />
              Recent Sales
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-stone-100">
            {sales.map((sale) => (
              <div key={sale.id} className="p-4 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <p className="font-bold text-sm">{sale.invoiceNo}</p>
                  <p className="text-[10px] text-stone-400 uppercase">{sale.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-green-600">₹{sale.total}</p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-stone-300 hover:text-stone-900 ml-1"
                    onClick={() => generatePDF(sale)}
                  >
                    <Printer size={12} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-stone-300 hover:text-green-600 ml-1"
                    onClick={() => window.open(shopUtils.generateWhatsAppMessage(sale), '_blank')}
                  >
                    <MessageSquare size={12} />
                  </Button>
                  {sale.status !== 'cancelled' && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-stone-300 hover:text-red-600 ml-1"
                      onClick={() => cancelSale(sale)}
                    >
                      <XCircle size={12} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {sales.map((sale) => sale.status === 'cancelled' && (
               <div key={sale.id + 'rev'} className="absolute inset-0 bg-white/50 backdrop-blur-[1px] pointer-events-none" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
