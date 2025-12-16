'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createNotification, fetchAllUsers, fetchGroupsByUser } from '../../lib/api';

interface CreateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const getUserId = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("user");
};

export default function CreateNotificationModal({ isOpen, onClose, onSuccess }: CreateNotificationModalProps) {
  const [type, setType] = useState<'single' | 'group'>('single');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipientUserId, setRecipientUserId] = useState('');
  const [recipientGroupId, setRecipientGroupId] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [groups, setGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Load users OR groups based on type
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      if (type === "group") {
        loadGroups();
      }
    }
  }, [isOpen, type]);

  // Load all users
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetchAllUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load groups created by logged-in user
const loadGroups = async () => {
  try {
    setLoadingGroups(true);

    const userId = getUserId();
    if (!userId) return; // Make sure it's string

    const res = await fetchGroupsByUser(userId); // No TS error now
    setGroups(res.data || []);
  } catch (err) {
    console.error(err);
  } finally {
    setLoadingGroups(false);
  }
};


  // Submit Notification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createNotification({
        type,
        title,
        message,
        createdBy: getUserId() || undefined,
        recipientUserId: type === 'single' ? recipientUserId : undefined,
        recipientGroupId: type === 'group' ? recipientGroupId : undefined,
        scheduledFor: scheduledFor || null,
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create notification');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setRecipientUserId('');
    setRecipientGroupId('');
    setScheduledFor('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Notification</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* TYPE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'single' | 'group')}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="single">Single User</option>
              <option value="group">Group</option>
            </select>
          </div>

          {/* TITLE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Notification title"
              required
            />
          </div>

          {/* MESSAGE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Notification message"
              rows={4}
              required
            />
          </div>

          {/* USER SELECTION */}
          {type === 'single' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>

              {loadingUsers ? (
                <div className="text-gray-500 text-sm">Loading users...</div>
              ) : (
                <select
                  value={recipientUserId}
                  onChange={(e) => setRecipientUserId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">-- Select User --</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.username || u.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            // GROUP SELECTION
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Group</label>

              {loadingGroups ? (
                <div className="text-gray-500 text-sm">Loading groups...</div>
              ) : (
                <select
                  value={recipientGroupId}
                  onChange={(e) => setRecipientGroupId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">-- Select Group --</option>
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* SCHEDULE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Schedule For (Optional)</label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* BUTTONS */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-md">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
