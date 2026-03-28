import React from 'react';
import { Notification } from '../types';
import { notificationService } from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, MessageSquare, UserPlus, MessageCircle, Trash2 } from 'lucide-react';

interface NotificationListProps {
  notifications: Notification[];
}

export const NotificationList: React.FC<NotificationListProps> = ({ notifications }) => {
  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <ThumbsUp size={16} className="text-blue-500" />;
      case 'comment': return <MessageSquare size={16} className="text-green-500" />;
      case 'friend_request': return <UserPlus size={16} className="text-purple-500" />;
      case 'message': return <MessageCircle size={16} className="text-blue-400" />;
      default: return null;
    }
  };

  const getMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'like': return <span><b>{notification.fromName}</b> liked your post.</span>;
      case 'comment': return <span><b>{notification.fromName}</b> commented on your post.</span>;
      case 'friend_request': return <span><b>{notification.fromName}</b> sent you a friend request.</span>;
      case 'message': return <span><b>{notification.fromName}</b> sent you a message.</span>;
      default: return '';
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="glass-card p-12 text-center border border-(--glass-border) shadow-sm">
        <Bell size={48} className="mx-auto text-(--text-secondary) opacity-50 mb-4" />
        <p className="text-(--text-secondary) font-medium">No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="glass-card shadow-sm border border-(--glass-border) overflow-hidden">
      {notifications.map(notification => (
        <div 
          key={notification.id}
          onClick={() => handleMarkAsRead(notification.id)}
          className={`p-4 flex items-start gap-4 border-b border-(--glass-border) hover:bg-(--fb-hover) transition-colors cursor-pointer relative group ${!notification.read ? 'bg-(--brand-primary)/5' : ''}`}
        >
          <div className="mt-1">
            {getIcon(notification.type)}
          </div>
          <div className="flex-1">
            <p className="text-sm text-(--text-primary)">{getMessage(notification)}</p>
            <p className="text-xs text-(--text-secondary) mt-1">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </p>
          </div>
          {!notification.read && (
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
          )}
          <button 
            onClick={(e) => handleDelete(e, notification.id)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

import { Bell } from 'lucide-react';
