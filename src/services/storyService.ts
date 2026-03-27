import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp,
  where,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string | null;
  imageUrl: string;
  type?: 'image' | 'video';
  createdAt: any;
  expiresAt: any;
}

export const storyService = {
  async createStory(userId: string, userName: string, userPhoto: string | null, imageUrl: string, type: 'image' | 'video' = 'image') {
    const path = 'stories';
    try {
      const storiesRef = collection(db, 'stories');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      return await addDoc(storiesRef, {
        userId,
        userName,
        userPhoto,
        imageUrl,
        type,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  getStories(currentUserId: string, friendIds: string[], callback: (stories: Story[]) => void) {
    const path = 'stories';
    const storiesRef = collection(db, 'stories');
    const now = new Date();
    const allowedUserIds = [currentUserId, ...friendIds];
    
    const q = query(
      storiesRef, 
      where('expiresAt', '>', Timestamp.fromDate(now)),
      orderBy('expiresAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      let stories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Story[];
      
      // Filter stories to only show from user and their friends
      stories = stories.filter(s => allowedUserIds.includes(s.userId));
      
      callback(stories);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  getAllStories(callback: (stories: Story[]) => void) {
    const path = 'stories';
    const storiesRef = collection(db, 'stories');
    const now = new Date();
    
    const q = query(
      storiesRef, 
      where('expiresAt', '>', Timestamp.fromDate(now)),
      orderBy('expiresAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const stories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Story[];
      
      callback(stories);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async cleanupExpiredStories() {
    const path = 'stories';
    try {
      const storiesRef = collection(db, 'stories');
      const now = new Date();
      const q = query(storiesRef, where('expiresAt', '<=', Timestamp.fromDate(now)));
      
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, 'stories', document.id)));
      await Promise.all(deletePromises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async deleteStory(storyId: string) {
    const path = `stories/${storyId}`;
    try {
      await deleteDoc(doc(db, 'stories', storyId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

