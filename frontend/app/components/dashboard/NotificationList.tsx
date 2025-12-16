'use client';

import { format } from 'date-fns';
import { Notification } from '../../types';

interface NotificationListProps {
  notifications: Notification[];
  title: string;
}

export default function NotificationList({ notifications, title }: NotificationListProps) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    scheduled: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No notifications yet</p>
        ) : (
          notifications.map((notification) => (
            <div key={notification._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{notification.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[notification.status]}`}>
                      {notification.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}