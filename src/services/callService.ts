import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { userService } from './userService';

export interface CallData {
  id?: string;
  callerId: string;
  receiverId: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended';
  offer?: any;
  answer?: any;
  createdAt: string;
}

export const callService = {
  startCall: async (callerId: string, receiverId: string, type: 'audio' | 'video', offer: any) => {
    const path = 'calls';
    try {
      const receiver = await userService.getUser(receiverId);
      if (receiver?.status === 'offline') {
        throw new Error('User is offline');
      }
      
      const callRef = await addDoc(collection(db, 'calls'), {
        callerId,
        receiverId,
        type,
        status: 'ringing',
        offer,
        createdAt: new Date().toISOString()
      });
      return callRef.id;
    } catch (error) {
      if (error instanceof Error && error.message === 'User is offline') {
        throw error;
      }
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  listenForCalls: (userId: string, callback: (call: CallData) => void) => {
    const path = 'calls';
    const q = query(collection(db, 'calls'), where('receiverId', '==', userId), where('status', '==', 'ringing'));
    return onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          callback({ id: change.doc.id, ...change.doc.data() } as CallData);
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  listenForCallStatus: (callId: string, callback: (call: CallData) => void) => {
    const path = `calls/${callId}`;
    return onSnapshot(doc(db, 'calls', callId), (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as CallData);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  respondToCall: async (callId: string, status: 'accepted' | 'rejected', answer?: any) => {
    const path = `calls/${callId}`;
    try {
      const callRef = doc(db, 'calls', callId);
      const updateData: any = { status };
      if (answer) updateData.answer = answer;
      await updateDoc(callRef, updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  endCall: async (callId: string) => {
    const path = `calls/${callId}`;
    try {
      await updateDoc(doc(db, 'calls', callId), { status: 'ended' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  addIceCandidate: async (callId: string, userId: string, candidate: any) => {
    const path = `calls/${callId}/iceCandidates`;
    try {
      await addDoc(collection(db, 'calls', callId, 'iceCandidates'), {
        userId,
        candidate: candidate.toJSON(),
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  listenForIceCandidates: (callId: string, userId: string, callback: (candidate: any) => void) => {
    const path = `calls/${callId}/iceCandidates`;
    const q = query(collection(db, 'calls', callId, 'iceCandidates'), where('userId', '!=', userId));
    return onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          callback(change.doc.data().candidate);
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  }
};
