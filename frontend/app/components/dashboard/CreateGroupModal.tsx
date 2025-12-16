'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { fetchAllUsers, createGroup } from '../../lib/api';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const getUserId = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("user");
};

export default function CreateGroupModal({ isOpen, onClose, onSuccess }: CreateGroupModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [members, setMembers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        if (isOpen) loadUsers();
    }, [isOpen]);

    const loadUsers = async () => {
        try {
            setLoadingUsers(true);
            const res = await fetchAllUsers();
            setUsers(res.users);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingUsers(false);
        }
    };

    if (!isOpen) return null;

    const toggleMember = (userId: string) => {
        if (members.includes(userId)) {
            setMembers(members.filter(id => id !== userId));
        } else {
            setMembers([...members, userId]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await createGroup({
                name,
                description,
                members,
                createdBy: getUserId()
            });

            onSuccess();
            onClose();
            resetForm();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.error || "Failed to create group");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setDescription('');
        setMembers([]);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Create Group</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* NAME */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Enter group name"
                            required
                        />
                    </div>

                    {/* DESCRIPTION */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Group description"
                            rows={3}
                        />
                    </div>

                    {/* USERS LIST */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Members</label>

                        {loadingUsers ? (
                            <p className="text-gray-500 text-sm">Loading users...</p>
                        ) : (
                            <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                                {users.map((user) => (
                                    <label key={user._id} className="flex items-center gap-2 p-1">
                                        <input
                                            type="checkbox"
                                            checked={members.includes(user._id)}
                                            onChange={() => toggleMember(user._id)}
                                        />
                                        <span>{user.username || user.email}</span>
                                    </label>
                                ))}
                            </div>
                        )}
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
                            {loading ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
