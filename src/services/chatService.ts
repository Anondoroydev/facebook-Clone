import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  or,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType, auth } from '../firebase';
import { Message } from '../types';

export const chatService = {
  /**
   * Upload an image or video file to Firebase Storage and return its download URL.
   * @param file - The File object to upload
   * @param senderId - UID of the sender (used in the storage path)
   * @param onProgress - Optional callback for upload progress (0–100)
   */
  uploadChatMedia: (
    file: File,
    senderId: string,
    onProgress?: (progress: number) => void
  ): Promise<{ url: string; mediaType: 'image' | 'video' }> => {
    return new Promise((resolve, reject) => {
      const mediaType: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
      const timestamp = Date.now();
      const storageRef = ref(storage, `chat-media/${senderId}/${timestamp}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(Math.round(progress));
        },
        (error) => {
          console.error('Media upload error:', error);
          reject(error);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url, mediaType });
        }
      );
    });
  },

  sendMessage: async (
    senderId: string,
    receiverId: string,
    content: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video'
  ) => {
    const path = 'messages';
    console.log('Sending message:', { senderId, receiverId, content, mediaUrl, mediaType });
    try {
      const docRef = await addDoc(collection(db, 'messages'), {
        senderId,
        receiverId,
        content,
        ...(mediaUrl ? { mediaUrl, mediaType } : {}),
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

    const q = query(
      collection(db, 'messages'),
      or(
        where('senderId', '==', userId),
        where('receiverId', '==', userId)
      )
    );
    
    return onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      
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
