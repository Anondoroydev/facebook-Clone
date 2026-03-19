import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Notification } from '../types';

export const notificationService = {
  sendNotification: async (notification: Omit<Notification, 'id'>) => {
    const path = 'notifications';
    try {
      return await addDoc(collection(db, 'notifications'), notification);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  getNotifications: (userId: string, callback: (notifications: Notification[]) => void) => {
    const path = 'notifications';
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', userId), 
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      callback(notifications);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  markAsRead: async (notificationId: string) => {
    const path = `notifications/${notificationId}`;
    try {
      return await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deleteNotification: async (notificationId: string) => {
    const path = `notifications/${notificationId}`;
    try {
      return await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
