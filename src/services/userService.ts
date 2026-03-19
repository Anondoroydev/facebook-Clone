import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  getDocs,
  setDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
  limit
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, FriendRequest } from '../types';

export const userService = {
  syncUser: async (user: any) => {
    const path = `users/${user.uid}`;
    console.time('syncUser');
    console.log('Syncing user profile for:', user.uid);
    try {
      const userRef = doc(db, 'users', user.uid);
      let userSnap;
      try {
        console.time('getDoc');
        userSnap = await getDoc(userRef);
        console.timeEnd('getDoc');
      } catch (e) {
        console.warn('Initial getDoc failed, attempting to create profile anyway:', e);
        // If we can't read it, maybe it doesn't exist and we have create permissions
      }
      
      if (!userSnap || !userSnap.exists()) {
        console.log('User profile not found, creating new profile...');
        const newUser: UserProfile = {
          uid: user.uid,
          displayName: user.displayName || 'Anonymous',
          email: user.email || '',
          photoURL: user.photoURL || '',
          status: 'online',
          role: user.email === 'anondoray553@gmail.com' ? 'admin' : 'user',
          friends: [],
          createdAt: new Date().toISOString()
        };
        console.time('setDoc');
        await setDoc(userRef, newUser);
        console.timeEnd('setDoc');
        console.log('New profile created successfully');
        console.timeEnd('syncUser');
        return newUser;
      }
      
      console.log('Existing user profile found');
      const existingUser = userSnap.data() as UserProfile;
      
      // Prepare updates
      const updates: any = {};
      let needsUpdate = false;

      // Update status to online when syncing (logging in)
      if (existingUser.status !== 'online') {
        updates.status = 'online';
        existingUser.status = 'online';
        needsUpdate = true;
      }

      if (!existingUser.friends) {
        console.log('Adding missing friends array to existing profile');
        updates.friends = [];
        existingUser.friends = [];
        needsUpdate = true;
      }

      if (!existingUser.role) {
        console.log('Adding missing role to existing profile');
        const defaultRole = user.email === 'anondoray553@gmail.com' ? 'admin' : 'user';
        updates.role = defaultRole;
        existingUser.role = defaultRole;
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log('Updating user profile with:', updates);
        console.time('updateDoc');
        await updateDoc(userRef, updates);
        console.timeEnd('updateDoc');
      }
      
      console.timeEnd('syncUser');
      return existingUser;
    } catch (error) {
      console.error('Error in syncUser:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  getUser: async (uid: string) => {
    const path = `users/${uid}`;
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      return userSnap.exists() ? (userSnap.data() as UserProfile) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  searchUsers: async (searchTerm: string) => {
    const q = query(collection(db, 'users'), where('displayName', '>=', searchTerm), where('displayName', '<=', searchTerm + '\uf8ff'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
  },

  updateProfile: async (userId: string, data: Partial<UserProfile>) => {
    const path = `users/${userId}`;
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  setStatus: async (userId: string, status: 'online' | 'offline') => {
    const path = `users/${userId}`;
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  listenToUser: (uid: string, callback: (user: UserProfile | null) => void) => {
    const path = `users/${uid}`;
    const userRef = doc(db, 'users', uid);
    return onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as UserProfile);
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  removeFriend: async (userId: string, friendId: string) => {
    const pathUser = `users/${userId}`;
    const pathFriend = `users/${friendId}`;
    try {
      const userRef = doc(db, 'users', userId);
      const friendRef = doc(db, 'users', friendId);
      
      await updateDoc(userRef, { friends: arrayRemove(friendId) });
      await updateDoc(friendRef, { friends: arrayRemove(userId) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, pathUser);
    }
  }
};

export const friendService = {
  sendRequest: async (senderId: string, senderName: string, receiverId: string) => {
    const path = 'friendRequests';
    try {
      // Check if already friends (both directions)
      const senderDoc = await getDoc(doc(db, 'users', senderId));
      const receiverDoc = await getDoc(doc(db, 'users', receiverId));
      
      if (senderDoc.exists() && senderDoc.data().friends.includes(receiverId)) {
        console.log('Already friends');
        return;
      }
      if (receiverDoc.exists() && receiverDoc.data().friends.includes(senderId)) {
        console.log('Already friends');
        return;
      }

      // Check if a request already exists (both directions)
      const q1 = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', senderId),
        where('receiverId', '==', receiverId),
        where('status', '==', 'pending')
      );
      const q2 = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', receiverId),
        where('receiverId', '==', senderId),
        where('status', '==', 'pending')
      );
      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      if (!snapshot1.empty || !snapshot2.empty) {
        console.log('Friend request already pending');
        return;
      }

      await addDoc(collection(db, 'friendRequests'), {
        senderId,
        receiverId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      const { notificationService } = await import('./notificationService');
      await notificationService.sendNotification({
        userId: receiverId,
        type: 'friend_request',
        fromId: senderId,
        fromName: senderName,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in sendRequest:', error);
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  getRequests: (userId: string, callback: (requests: FriendRequest[]) => void) => {
    const q = query(collection(db, 'friendRequests'), where('receiverId', '==', userId), where('status', '==', 'pending'));
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest));
      callback(requests);
    });
  },

  getSentRequests: (userId: string, callback: (requests: FriendRequest[]) => void) => {
    const q = query(collection(db, 'friendRequests'), where('senderId', '==', userId), where('status', '==', 'pending'));
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest));
      callback(requests);
    });
  },

  respondToRequest: async (requestId: string, status: 'accepted' | 'declined') => {
    const pathReq = `friendRequests/${requestId}`;
    console.log('respondToRequest called:', { requestId, status });
    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      const requestSnap = await getDoc(requestRef);
      if (!requestSnap.exists()) {
        console.error('Friend request not found:', requestId);
        throw new Error('Friend request not found');
      }
      const requestData = requestSnap.data() as FriendRequest;
      
      console.log('Responding to friend request:', {
        requestId,
        status,
        currentUserId: auth.currentUser?.uid,
        senderId: requestData.senderId,
        receiverId: requestData.receiverId
      });

      await updateDoc(requestRef, { status });
      console.log('Friend request status updated');

      if (status === 'accepted') {
        const senderRef = doc(db, 'users', requestData.senderId);
        const receiverRef = doc(db, 'users', requestData.receiverId);
        
        console.log('Accepting request, updating friends for:', requestData.senderId, requestData.receiverId);
        await updateDoc(senderRef, { friends: arrayUnion(requestData.receiverId) });
        await updateDoc(receiverRef, { friends: arrayUnion(requestData.senderId) });
        console.log('Friends updated successfully');
      }
    } catch (error) {
      console.error('Error in respondToRequest:', error);
      handleFirestoreError(error, OperationType.UPDATE, pathReq);
    }
  }
};
