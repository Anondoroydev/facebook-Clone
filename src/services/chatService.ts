import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  or,
  and,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { Message } from '../types';

export const chatService = {
  sendMessage: async (senderId: string, receiverId: string, content: string) => {
    const path = 'messages';
    console.log('Sending message:', { senderId, receiverId, content });
    try {
      const docRef = await addDoc(collection(db, 'messages'), {
        senderId,
        receiverId,
        content,
        createdAt: new Date().toISOString(),
        read: false
      });
      console.log('Message sent, ID:', docRef.id);
      return docRef;
    } catch (error) {
      console.error('Error sending message:', error);
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  getMessages: (userId: string, otherId: string, callback: (messages: Message[]) => void) => {
    const path = 'messages';
    console.log('Fetching messages for:', { userId, otherId });
    
    // Firestore requires a composite index for complex OR queries with orderBy.
    // To avoid index issues, we can fetch all messages involving the user and filter locally,
    // or use two separate queries and merge them. Given the typical size of chat histories,
    // fetching all messages for the user and filtering is often simpler if indexes aren't set up.
    // However, a better approach without complex indexes is to query by a combined ID or just
    // fetch messages where sender is userId OR receiver is userId, then filter.
    
    // For now, let's try a simpler query that might not need a complex index if we sort client-side
    const q = query(
      collection(db, 'messages'),
      or(
        where('senderId', '==', userId),
        where('receiverId', '==', userId)
      )
    );
    
    return onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      
      // Filter for this specific chat and sort client-side
      const chatMessages = allMessages
        .filter(msg => 
          (msg.senderId === userId && msg.receiverId === otherId) ||
          (msg.senderId === otherId && msg.receiverId === userId)
        )
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
      console.log('Messages snapshot:', chatMessages);
      callback(chatMessages);
    }, (error) => {
      console.error('Error in messages snapshot:', error);
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  markAsRead: async (messageId: string) => {
    const path = `messages/${messageId}`;
    try {
      return await updateDoc(doc(db, 'messages', messageId), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  
  setTypingStatus: async (userId: string, typingTo: string, isTyping: boolean) => {
    const path = `typingStatus/${userId}`;
    try {
      await setDoc(doc(db, 'typingStatus', userId), {
        userId,
        typingTo,
        isTyping,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  listenForTypingStatus: (userId: string, callback: (isTyping: boolean) => void) => {
    const path = `typingStatus/${userId}`;
    return onSnapshot(doc(db, 'typingStatus', userId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback(data.isTyping && data.typingTo === auth.currentUser?.uid);
      } else {
        callback(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }
};
