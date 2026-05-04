import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export const reportingService = {
  async getProfitLoss(userId: string, startDate: Date, endDate: Date) {
    const qSales = query(
      collection(db, 'sales'),
      where('ownerId', '==', userId)
    );
    
    const qExpenses = query(
      collection(db, 'expenses'),
      where('ownerId', '==', userId)
    );

    const [salesSnap, expensesSnap] = await Promise.all([
      getDocs(qSales),
      getDocs(qExpenses)
    ]);

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();
    const startDay = startISO.split('T')[0];
    const endDay = endISO.split('T')[0];

    const totalSales = salesSnap.docs.reduce((sum, doc) => {
      const data = doc.data();
      if (data.timestamp >= startISO && data.timestamp <= endISO) {
        return sum + (data.total || 0);
      }
      return sum;
    }, 0);

    const totalExpenses = expensesSnap.docs.reduce((sum, doc) => {
      const data = doc.data();
      if (data.date >= startDay && data.date <= endDay) {
        return sum + (data.amount || 0);
      }
      return sum;
    }, 0);

    return {
      revenue: totalSales,
      expenses: totalExpenses,
      profit: totalSales - totalExpenses,
      margin: totalSales > 0 ? ((totalSales - totalExpenses) / totalSales) * 100 : 0
    };
  },

  async getTopProducts(userId: string, limitCount = 5) {
    const q = query(collection(db, 'sales'), where('ownerId', '==', userId));
    const salesSnap = await getDocs(q);
    const productCounts: Record<string, { name: string, quantity: number, revenue: number }> = {};

    salesSnap.docs.forEach(doc => {
      const data = doc.data();
      (data.items || []).forEach((item: any) => {
        if (!productCounts[item.itemId]) {
          productCounts[item.itemId] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productCounts[item.itemId].quantity += (item.quantity || 0);
        productCounts[item.itemId].revenue += (item.total || 0);
      });
    });

    return Object.values(productCounts)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limitCount);
  },

  exportToCSV(data: any[], filename: string) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
