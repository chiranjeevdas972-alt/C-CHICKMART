import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface AppNotification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'order' | 'stock' | 'farm' | 'system';
  read: boolean;
  timestamp: any;
}

export const notificationService = {
  async notify(userId: string, notification: Omit<AppNotification, 'userId' | 'read' | 'timestamp'>) {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notification,
        userId,
        read: false,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  },

  subscribeToNotifications(userId: string, callback: (notifications: AppNotification[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AppNotification[];
      
      // Sort locally by timestamp
      const sorted = [...notifications].sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });

      callback(sorted);
    }, (err) => {
      console.error('Notification snapshot error:', err);
    });
  },

  async markAsRead(notificationId: string) {
    const ref = doc(db, 'notifications', notificationId);
    await updateDoc(ref, { read: true });
  }
};
