import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { Bird, ShoppingBag, LayoutDashboard, LogOut, Package, History, BrainCircuit, Plus, Users, Wallet, BarChart3, Truck, FileText, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import InventoryModule from './InventoryModule';
import ShopModule from './ShopModule';
import FarmModule from './FarmModule';
import AccountsModule from './AccountsModule';
import CustomerModule from './CustomerModule';
import AnalyticsModule from './AnalyticsModule';
import DeliveryModule from './DeliveryModule';
import AdvancedReportingModule from './AdvancedReportingModule';
import AdminModule from './AdminModule';
import Activity from './Activity';
import NotificationCenter from './NotificationCenter';
import { useTranslation } from 'react-i18next';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';

interface DashboardProps {
  user: FirebaseUser;
  profile: any;
  onLogout: () => void;
}

const HenIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 2C14.2091 2 16 3.79086 16 6V8" />
    <path d="M16 8C19 8 20 10 20 12C20 14 19 16 16 16H8C5 16 4 14 4 12C4 10 5 8 8 8" />
    <path d="M8 8V6C8 3.79086 9.79086 2 12 2Z" />
    <path d="M10 16V20" />
    <path d="M14 16V20" />
    <circle cx="10" cy="11" r="0.5" fill="currentColor" />
    <path d="M15 4L17 3" strokeWidth="1.5" />
    <path d="M13 3L15 2" strokeWidth="1.5" />
  </svg>
);

export default function Dashboard({ user, profile, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [moduleAction, setModuleAction] = useState<string | null>(null);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalBirds: 0,
    totalSales: 0,
    activeBatches: 0,
    lowStock: 0
  });

  useEffect(() => {
    // Basic stats listeners
    const unsubInv = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      let birds = 0;
      let low = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.type === 'live_bird') birds += data.quantity;
        if (data.quantity <= (data.lowStockThreshold || 0)) low++;
      });
      setStats(prev => ({ ...prev, totalBirds: birds, lowStock: low }));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'inventory'));

    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      let total = 0;
      snapshot.docs.forEach(doc => total += (Number(doc.data().total) || 0));
      setStats(prev => ({ ...prev, totalSales: total }));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'sales'));

    const unsubBatches = onSnapshot(collection(db, 'batches'), (snapshot) => {
      const active = snapshot.docs.filter(d => d.data().status === 'active').length;
      setStats(prev => ({ ...prev, activeBatches: active }));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'batches'));

    return () => {
      unsubInv();
      unsubSales();
      unsubBatches();
    };
  }, []);

  const menuItems = [
    { id: 'overview', label: t('dashboard'), icon: <LayoutDashboard size={18} /> },
    { id: 'farm', label: t('farm'), icon: <HenIcon size={18} /> },
    { id: 'shop', label: t('shop'), icon: <ShoppingBag size={18} /> },
    { id: 'inventory', label: t('inventory'), icon: <Package size={18} /> },
    { id: 'accounts', label: t('accounts'), icon: <Wallet size={18} /> },
    { id: 'customers', label: t('customers'), icon: <Users size={18} /> },
    { id: 'delivery', label: 'Delivery', icon: <Truck size={18} />, hidden: profile?.subscriptionType === 'trial' },
    { id: 'advanced_reports', label: 'Financials', icon: <FileText size={18} />, hidden: profile?.subscriptionType === 'trial' },
    { id: 'admin', label: 'Admin', icon: <ShieldCheck size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} />, hidden: profile?.subscriptionType === 'trial' },
  ].filter(item => !item.hidden);

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-stone-100">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white">
            <HenIcon size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight text-stone-900">ChickMart</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id 
                  ? 'bg-stone-900 text-white shadow-lg shadow-stone-200' 
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-stone-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-stone-200 overflow-hidden">
              <img src={user.photoURL || ''} alt="" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.displayName}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">{profile?.role}</p>
                {profile?.subscriptionType && (
                  <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded-full font-black ${
                    profile.subscriptionType === 'professional' ? 'bg-purple-100 text-purple-700' :
                    profile.subscriptionType === 'standard' ? 'bg-orange-100 text-orange-700' :
                    'bg-stone-100 text-stone-500'
                  }`}>
                    {profile.subscriptionType}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button 
            onClick={onLogout} 
            variant="ghost" 
            className="w-full justify-start text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
          >
            <LogOut size={18} className="mr-3" />
            {t('logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8 flex justify-between items-end">
          <div className="flex items-center gap-4">
            {activeTab !== 'overview' && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActiveTab('overview')}
                className="rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-900"
              >
                <ArrowLeft size={24} />
              </Button>
            )}
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-stone-900">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-stone-500 mt-1">
                Welcome back, {user.displayName?.split(' ')[0]}
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <NotificationCenter />
            <Dialog 
              open={isQuickActionOpen} 
              onOpenChange={setIsQuickActionOpen}
            >
              <DialogTrigger
                render={
                  <Button className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-sm gap-2">
                    <Plus size={18} />
                    Quick Action
                  </Button>
                }
              />
              <DialogContent className="rounded-[2rem] max-w-sm p-6 border-none">
                <DialogHeader className="flex flex-row items-center justify-between mb-4 space-y-0">
                  <DialogTitle className="text-xl font-bold text-stone-900">Quick Actions</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 pb-2">
                  {[
                    { label: 'NEW SALE', icon: <ShoppingBag size={24} />, active: 'shop', action: 'new-sale', color: 'bg-[#FFF7ED] text-[#EA580C]' },
                    { label: 'ADD CHICK', icon: <HenIcon size={24} />, active: 'farm', action: 'add-batch', color: 'bg-[#FFF7ED] text-[#EA580C]' },
                    { label: 'LOG FEED', icon: <Package size={24} />, active: 'farm', action: 'log-feed', color: 'bg-[#FFFBEB] text-[#D97706]' },
                    { label: 'ADD EXPENSE', icon: <Wallet size={24} />, active: 'accounts', action: 'add-expense', color: 'bg-[#FEF2F2] text-[#DC2626]' },
                    { label: 'NEW CUST', icon: <Users size={24} />, active: 'customers', action: 'add-cust', color: 'bg-[#FAF5FF] text-[#9333EA]' },
                    { label: 'REPORTS', icon: <BarChart3 size={24} />, active: 'analytics', action: 'reports', color: 'bg-[#F0FDF4] text-[#16A34A]' },
                  ].map((act, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setActiveTab(act.active);
                        if (act.action) setModuleAction(act.action);
                        setIsQuickActionOpen(false);
                      }}
                      className={`flex flex-col items-center justify-center p-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 ${act.color}`}
                    >
                      <div className="mb-2">{act.icon}</div>
                      <span className="text-[10px] font-black tracking-wider text-center">{act.label}</span>
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="space-y-8">
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: t('total_birds'), value: stats.totalBirds, color: 'text-stone-900', target: 'farm' },
                  { label: t('total_sales'), value: `₹${stats.totalSales.toLocaleString()}`, color: 'text-green-600', target: 'analytics' },
                  { label: 'Active Batches', value: stats.activeBatches, color: 'text-blue-600', target: 'farm' },
                  { label: 'Low Stock Items', value: stats.lowStock, color: stats.lowStock > 0 ? 'text-red-600' : 'text-stone-900', target: 'inventory' },
                ].map((stat, i) => (
                  <Card 
                    key={i} 
                    className="rounded-3xl border-stone-200 shadow-sm overflow-hidden cursor-pointer hover:border-orange-200 transition-colors group"
                    onClick={() => setActiveTab(stat.target)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-widest text-stone-400 group-hover:text-orange-500 transition-colors">{stat.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <AnalyticsModule onNavigate={(tab) => setActiveTab(tab)} />
            </>
          )}

          {activeTab === 'farm' && <FarmModule action={moduleAction} onActionComplete={() => setModuleAction(null)} profile={profile} />}
          {activeTab === 'shop' && <ShopModule action={moduleAction} onActionComplete={() => setModuleAction(null)} profile={profile} />}
          {activeTab === 'inventory' && <InventoryModule />}
          {activeTab === 'accounts' && <AccountsModule action={moduleAction} onActionComplete={() => setModuleAction(null)} />}
          {activeTab === 'customers' && <CustomerModule action={moduleAction} onActionComplete={() => setModuleAction(null)} />}
          {activeTab === 'delivery' && <DeliveryModule />}
          {activeTab === 'advanced_reports' && <AdvancedReportingModule />}
          {activeTab === 'admin' && <Activity profile={profile} />}
          {activeTab === 'analytics' && <AnalyticsModule onNavigate={(tab) => setActiveTab(tab)} />}
        </div>
      </main>
    </div>
  );
}
