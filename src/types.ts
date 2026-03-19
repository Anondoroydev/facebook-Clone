export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  coverPhotoURL?: string;
  bio?: string;
  status?: 'online' | 'offline' | 'away';
  role: 'admin' | 'user';
  friends: string[];
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  likes: string[];
  commentCount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'friend_request' | 'message';
  fromId: string;
  fromName: string;
  postId?: string;
  read: boolean;
  createdAt: string;
}
