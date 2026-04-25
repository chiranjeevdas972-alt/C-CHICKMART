import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Truck, MapPin, CheckCircle2, Clock, UserCheck, ArrowLeft, PackageCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function DeliveryModule() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      // For demo/system simulation, we assume some orders might need delivery
      // Real implementation would have a 'deliveryStatus' field
      setOrders(snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        deliveryStatus: d.data().deliveryStatus || 'pending_assignment'
      })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sales'));

    return () => unsub();
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const ref = doc(db, 'sales', orderId);
      const updateData: any = { 
        deliveryStatus: status,
        updatedAt: new Date().toISOString()
      };
      
      // Store history of status changes
      const order = orders.find(o => o.id === orderId);
      const history = order?.deliveryHistory || [];
      updateData.deliveryHistory = [...history, { status, timestamp: new Date().toISOString() }];

      await updateDoc(ref, updateData);
      
      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'delivery_update',
        orderId,
        status,
        timestamp: new Date().toISOString(),
        userId: 'system' // Should be current user
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sales/${orderId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'in_transit': return 'bg-blue-100 text-blue-700';
      case 'pending_assignment': return 'bg-orange-100 text-orange-700';
      default: return 'bg-stone-100 text-stone-700';
    }
  };

  if (selectedTrackingOrder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTrackingOrder(null)} className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h3 className="text-xl font-bold">Tracking Order #{selectedTrackingOrder.invoiceNo}</h3>
            <p className="text-sm text-stone-500">Customer: {selectedTrackingOrder.customerName}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="rounded-[2rem] p-8 border-stone-200">
            <h4 className="font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Clock className="text-orange-600" size={18} />
              Delivery Timeline
            </h4>
            <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-100">
              {(selectedTrackingOrder.deliveryHistory || [{ status: 'order_placed', timestamp: selectedTrackingOrder.timestamp }]).map((h: any, i: number) => (
                <div key={i} className="flex gap-6 relative">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white ${i === 0 ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-stone-100 text-stone-400'}`}>
                    <PackageCheck size={16} />
                  </div>
                  <div className="pt-1">
                    <p className="font-bold text-stone-900 capitalize">{h.status.replace('_', ' ')}</p>
                    <p className="text-xs text-stone-500">{format(new Date(h.timestamp), 'MMM dd, HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[2rem] p-8 border-stone-200 bg-stone-50/50">
              <h4 className="font-bold text-stone-900 mb-4">Customer Details</h4>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <MapPin className="text-stone-400" size={18} />
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase">Delivery Address</p>
                    <p className="text-sm font-bold text-stone-900">{selectedTrackingOrder.customerAddress || 'No address provided'}</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-stone-100">
                  <PackageCheck className="text-stone-400" size={18} />
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase">Items</p>
                    <p className="text-sm font-bold text-stone-900">
                      {selectedTrackingOrder.items.length} items worth ₹{selectedTrackingOrder.total}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
            <Button 
              className="w-full h-14 rounded-2xl bg-stone-900 text-white"
              onClick={() => setSelectedTrackingOrder(null)}
            >
              Back to List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-stone-200">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Truck className="text-orange-600" size={24} />
            Delivery Management
          </h2>
          <p className="text-stone-500 text-sm mt-1">Track and assign orders for customer delivery</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="rounded-full px-4 py-1 flex gap-2">
            <Clock size={14} /> {orders.filter(o => o.deliveryStatus === 'pending_assignment').length} Pending
          </Badge>
          <Badge variant="outline" className="rounded-full px-4 py-1 flex gap-2">
            <Truck size={14} /> {orders.filter(o => o.deliveryStatus === 'in_transit').length} Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {orders.slice(0, 12).map((order) => (
          <Card key={order.id} className="rounded-3xl border-stone-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <CardHeader className="bg-stone-50/50 border-b border-stone-100 flex flex-row justify-between items-center py-4">
              <span className="text-xs font-bold text-stone-400">#{order.invoiceNo}</span>
              <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-full ${getStatusColor(order.deliveryStatus)}`}>
                {order.deliveryStatus.replace('_', ' ')}
              </span>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div 
                className="flex items-start gap-3 cursor-pointer group"
                onClick={() => setSelectedTrackingOrder(order)}
              >
                <MapPin className="text-orange-500 shrink-0 group-hover:scale-110 transition-transform" size={18} />
                <div className="min-w-0">
                  <p className="font-bold text-stone-900 truncate">{order.customerName || 'Walk-in Customer'}</p>
                  <p className="text-xs text-stone-500 truncate">{order.customerAddress || 'No address provided'}</p>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-stone-500 pt-2 border-t border-stone-50">
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  {format(new Date(order.timestamp), 'MMM dd, p')}
                </div>
                <div className="font-bold text-stone-900">₹{order.total}</div>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-2">
                {order.deliveryStatus === 'pending_assignment' && (
                  <Button 
                    className="w-full rounded-xl bg-stone-900 text-white gap-2" 
                    onClick={() => updateStatus(order.id, 'in_transit')}
                  >
                    <UserCheck size={16} /> Assign Rider
                  </Button>
                )}
                {order.deliveryStatus === 'in_transit' && (
                  <Button 
                    className="w-full rounded-xl bg-green-600 text-white gap-2" 
                    onClick={() => updateStatus(order.id, 'delivered')}
                  >
                    <CheckCircle2 size={16} /> Mark Delivered
                  </Button>
                )}
                {order.deliveryStatus === 'delivered' && (
                  <div className="flex items-center justify-center gap-2 py-2 text-green-600 font-bold text-sm">
                    <CheckCircle2 size={18} /> Completed
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
