import React from 'react';
import { UserProfile, FriendRequest } from '../types';
import { friendService, userService } from '../services/userService';
import { User as UserIcon, Check, X, Users, MessageCircle } from 'lucide-react';

interface FriendRequestListProps {
  requests: FriendRequest[];
  onRespond: (status: 'accepted' | 'declined', sender?: UserProfile) => void | Promise<void>;
}

export const FriendRequestList: React.FC<FriendRequestListProps> = ({ requests, onRespond }) => {
  const handleResponse = async (id: string, status: 'accepted' | 'declined', sender?: UserProfile) => {
    console.log('Handling friend request response:', { id, status, sender });
    try {
      if (status === 'accepted' || status === 'declined') {
        await friendService.respondToRequest(id, status);
        console.log('friendService.respondToRequest completed');
      }
      onRespond(status, sender);
      console.log('onRespond called');
    } catch (error) {
      console.error('Error responding to request:', error);
      throw error; // Rethrow so the card can catch it
    }
  };

  if (requests.length === 0) {
    return (
      <div className="bg-(--fb-card) rounded-xl p-8 text-center border border-(--fb-divider)/30 shadow-sm">
        <Users size={48} className="mx-auto text-(--fb-text-secondary)/30 mb-4" />
        <p className="text-(--fb-text-secondary) font-medium">No pending friend requests</p>
      </div>
    );

  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {requests.map(req => (
        <FriendRequestCard key={req.id} request={req} onRespond={handleResponse} />
      ))}
    </div>
  );
};

const FriendRequestCard: React.FC<{ request: FriendRequest, onRespond: (id: string, status: 'accepted' | 'declined', sender?: UserProfile) => Promise<void> }> = ({ request, onRespond }) => {
  const [sender, setSender] = React.useState<UserProfile | null>(null);
  const [isResponded, setIsResponded] = React.useState(false);
  const [responseStatus, setResponseStatus] = React.useState<'accepted' | 'declined' | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  React.useEffect(() => {
    userService.getUser(request.senderId).then(setSender);
  }, [request.senderId]);

  const handleAction = async (status: 'accepted' | 'declined') => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onRespond(request.id, status, sender || undefined);
      setIsResponded(true);
      setResponseStatus(status);
    } catch (error) {
      console.error('Failed to respond to request:', error);
      alert('Failed to process request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!sender) return null;

  if (isResponded && responseStatus === 'accepted') {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-4 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-green-500">
          {sender.photoURL ? (
            <img src={sender.photoURL} alt={sender.displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
              <UserIcon size={32} />
            </div>
          )}
        </div>
        <h4 className="font-bold text-gray-900">{sender.displayName}</h4>
        <p className="text-sm text-green-600 font-medium mt-1">Request Accepted!</p>
        <button 
          onClick={() => {
            // This will be handled by the parent to open the chat
            onRespond(request.id, 'accepted', sender);
          }}
          className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle size={18} /> Message
        </button>
      </div>
    );
  }

  if (isResponded && responseStatus === 'declined') {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-4 flex flex-col items-center text-center opacity-60">
        <p className="text-gray-500 font-medium">Request removed</p>
      </div>
    );
  }

  return (
    <div className="bg-(--fb-card) rounded-xl border border-(--fb-divider)/30 shadow-sm overflow-hidden">

      <div className="aspect-square bg-gray-100">
        {sender.photoURL ? (
          <img src={sender.photoURL} alt={sender.displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <UserIcon size={64} />
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-bold text-gray-900 truncate">{sender.displayName}</h4>
        <div className="mt-4 flex flex-col gap-2">
          <button 
            onClick={() => handleAction('accepted')}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={18} /> Confirm
          </button>
          <button 
            onClick={() => handleAction('declined')}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <X size={18} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};
