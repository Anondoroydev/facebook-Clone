import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc, 
  getDocs,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Post, Comment } from '../types';

export const postService = {
  createPost: async (authorId: string, authorName: string, authorPhoto: string | undefined, content: string, imageUrl?: string, videoUrl?: string) => {
    const path = 'posts';
    try {
      return await addDoc(collection(db, 'posts'), {
        authorId,
        authorName,
        authorPhoto: authorPhoto || '',
        content,
        imageUrl: imageUrl || '',
        videoUrl: videoUrl || '',
        likes: [],
        commentCount: 0,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  getPosts: (callback: (posts: Post[]) => void) => {
    const path = 'posts';
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      callback(posts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  likePost: async (postId: string, userId: string, isLiked: boolean, authorId: string, userName: string) => {
    const path = `posts/${postId}`;
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
      });

      if (!isLiked && userId !== authorId) {
        const { notificationService } = await import('./notificationService');
        await notificationService.sendNotification({
          userId: authorId,
          type: 'like',
          fromId: userId,
          fromName: userName,
          postId,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  addComment: async (postId: string, authorId: string, authorName: string, authorPhoto: string | undefined, content: string, postAuthorId: string) => {
    const commentPath = `posts/${postId}/comments`;
    const postPath = `posts/${postId}`;
    try {
      await addDoc(collection(db, `posts/${postId}/comments`), {
        postId,
        authorId,
        authorName,
        authorPhoto: authorPhoto || '',
        content,
        createdAt: new Date().toISOString()
      });
      
      await updateDoc(doc(db, 'posts', postId), {
        commentCount: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, commentPath);
    }
  },

  getComments: (postId: string, callback: (comments: Comment[]) => void) => {
    const path = `posts/${postId}/comments`;
    const q = query(collection(db, `posts/${postId}/comments`), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      callback(comments);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  deletePost: async (postId: string) => {
    const path = `posts/${postId}`;
    try {
      // Delete comments first while the post still exists (for permission checks)
      const commentsRef = collection(db, `posts/${postId}/comments`);
      const commentsSnapshot = await getDocs(commentsRef);
      const deletePromises = commentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Then delete the post itself
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
