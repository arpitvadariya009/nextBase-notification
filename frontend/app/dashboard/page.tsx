// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import {
//     Bell,
//     Users,
//     Clock,
//     CheckCircle,
//     XCircle,
//     Activity,
//     Send,
//     LogOut,
//     Wifi,
//     WifiOff,
//     Plus,
// } from 'lucide-react';
// import StatsCard from '../components/dashboard/StatsCard';
// import NotificationList from '../components/dashboard/NotificationList';
// import CreateNotificationModal from '../components/dashboard/CreateNotificationModal';
// import CreateGroupModal from '../components/dashboard/CreateGroupModal';
// import { useWebSocket } from '../hooks/useWebSocket';
// import {
//     getDashboardOverview,
//     getSentNotifications,
//     getReceivedNotifications,
//     getQueueStatus,
// } from '../lib/api';
// import { DashboardOverview, Notification, QueueStats } from '../types';

// export default function DashboardPage() {
//     const router = useRouter();
//     const [token, setToken] = useState<string>('');
//     const [user, setUser] = useState<any>(null);
//     const [overview, setOverview] = useState<DashboardOverview | null>(null);
//     const [queue, setqueue] = useState<QueueStats | null>(null);
//     const [sentNotifications, setSentNotifications] = useState<Notification[]>([]);
//     const [receivedNotifications, setReceivedNotifications] = useState<any[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [isModalOpen, setIsModalOpen] = useState(false);
//     const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
//     const { isConnected, isAuthenticated, messages } = useWebSocket(token);
//     console.log("++++++++++++++++++++++++++++++++++++++++++", overview);

//     useEffect(() => {
//         const storedToken = localStorage.getItem('token');
//         const storedUser = localStorage.getItem('user');

//         if (!storedToken) {
//             router.push('/');
//             return;
//         }

//         setToken(storedToken);
//         setUser(storedUser);
//         loadDashboardData();
//     }, [router]);

//     const loadDashboardData = async () => {
//         setLoading(true);
//         try {
//             const [overviewData, sentData, receivedData, queueData] = await Promise.all([
//                 getDashboardOverview(),
//                 getSentNotifications(1, 10),
//                 getReceivedNotifications(1, 10),
//                 getQueueStatus()
//             ]);

//             setOverview(overviewData.stats);
//             setSentNotifications(sentData.notifications);
//             setReceivedNotifications(receivedData.notifications);
//             setqueue(queueData);
//         } catch (error) {
//             console.error('Failed to load dashboard data:', error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleLogout = () => {
//         localStorage.removeItem('token');
//         localStorage.removeItem('user');
//         router.push('/');
//     };

//     const handleNotificationCreated = () => {
//         loadDashboardData();
//     };

//     // Listen for new notifications via WebSocket
//     useEffect(() => {
//         const newNotifications = messages.filter((msg) => msg.type === 'notification:new');
//         if (newNotifications.length > 0) {
//             // Reload notifications when new one arrives
//             loadDashboardData();
//         }
//     }, [messages]);

//     if (loading) {
//         return (
//             <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//                 <div className="text-center">
//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//                     <p className="mt-4 text-gray-600">Loading dashboard...</p>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="min-h-screen bg-gray-50">
//             {/* Header */}
//             <header className="bg-white shadow-sm">
//                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <h1 className="text-2xl font-bold text-gray-900">Notification Dashboard</h1>
//                             <p className="text-sm text-gray-600">Welcome back, {user?.username}!</p>
//                         </div>

//                         <div className="flex items-center gap-4">
//                             {/* WebSocket Status */}
//                             <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100">
//                                 {isConnected ? (
//                                     <>
//                                         <Wifi className="w-4 h-4 text-green-600" />
//                                         <span className="text-sm font-medium text-green-600">
//                                             {isAuthenticated ? 'Connected & Authenticated' : 'Connected'}
//                                         </span>
//                                     </>
//                                 ) : (
//                                     <>
//                                         <WifiOff className="w-4 h-4 text-red-600" />
//                                         <span className="text-sm font-medium text-red-600">Disconnected</span>
//                                     </>
//                                 )}
//                             </div>
//                             <button
//                                 onClick={() => setIsGroupModalOpen(true)}
//                                 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//                             >
//                                 <Plus className="w-4 h-4" />
//                                 Create Group
//                             </button>
//                             {/* Create Notification Button */}
//                             <button
//                                 onClick={() => setIsModalOpen(true)}
//                                 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//                             >
//                                 <Plus className="w-4 h-4" />
//                                 Create Notification
//                             </button>

//                             {/* Logout Button */}
//                             <button
//                                 onClick={handleLogout}
//                                 className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
//                             >
//                                 <LogOut className="w-4 h-4" />
//                                 Logout
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </header>

//             {/* Main Content */}
//             <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//                 {/* Stats Grid */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

//                     <StatsCard
//                         title="Total Notifications"
//                         value={overview?.totalSent || 0}
//                         icon={Bell}
//                         color="blue"
//                     />

//                     <StatsCard
//                         title="Pending Notifications"
//                         value={overview?.pending || 0}
//                         icon={Clock}
//                         color="yellow"
//                     />

//                     <StatsCard
//                         title="Scheduled Notifications"
//                         value={overview?.scheduled || 0}
//                         icon={Activity}
//                         color="purple"
//                     />

//                     <StatsCard
//                         title="Delivered Notifications"
//                         value={overview?.delivered || 0}
//                         icon={CheckCircle}
//                         color="green"
//                     />

//                 </div>


//                 {/* Queue Stats */}
//                 <div className="bg-white rounded-lg shadow-md p-6 mb-8">
//                     <h2 className="text-xl font-semibold text-gray-900 mb-4">Queue Statistics</h2>
//                     <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
//                         <div className="text-center p-4 bg-yellow-50 rounded-lg">
//                             <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
//                             <p className="text-2xl font-bold text-gray-900">{queue?.waiting || 0}</p>
//                             <p className="text-sm text-gray-600">Waiting</p>
//                         </div>
//                         <div className="text-center p-4 bg-blue-50 rounded-lg">
//                             <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
//                             <p className="text-2xl font-bold text-gray-900">{queue?.total || 0}</p>
//                             <p className="text-sm text-gray-600">Total</p>
//                         </div>
//                         <div className="text-center p-4 bg-green-50 rounded-lg">
//                             <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
//                             <p className="text-2xl font-bold text-gray-900">{queue?.completed || 0}</p>
//                             <p className="text-sm text-gray-600">Completed</p>
//                         </div>
//                         <div className="text-center p-4 bg-red-50 rounded-lg">
//                             <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
//                             <p className="text-2xl font-bold text-gray-900">{queue?.failed || 0}</p>
//                             <p className="text-sm text-gray-600">Failed</p>
//                         </div>
//                         <div className="text-center p-4 bg-purple-50 rounded-lg">
//                             <Send className="w-8 h-8 text-purple-600 mx-auto mb-2" />
//                             <p className="text-2xl font-bold text-gray-900">{queue?.scheduled || 0}</p>
//                             <p className="text-sm text-gray-600">Scheduled</p>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Notification Status Distribution */}
//                 {/* <div className="bg-white rounded-lg shadow-md p-6 mb-8">
//                     <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Status</h2>
//                     <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
//                         {overview?.notifications.byStatus &&
//                             Object.entries(overview.notifications.byStatus).map(([status, count]) => (
//                                 <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
//                                     <p className="text-2xl font-bold text-gray-900">{count}</p>
//                                     <p className="text-sm text-gray-600 capitalize">{status}</p>
//                                 </div>
//                             ))}
//                     </div>
//                 </div> */}

//                 {/* Notifications Lists */}
//                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
//                     <NotificationList notifications={sentNotifications} title="Sent Notifications" />
//                     <NotificationList
//                         notifications={receivedNotifications.map((d) => d.notification)}
//                         title="Received Notifications"
//                     />
//                 </div>

//                 {/* Recent WebSocket Messages
//                 <div className="bg-white rounded-lg shadow-md p-6">
//                     <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent WebSocket Messages</h2>
//                     <div className="space-y-2 max-h-96 overflow-y-auto">
//                         {messages.length === 0 ? (
//                             <p className="text-gray-500 text-center py-8">No messages yet</p>
//                         ) : (
//                             messages.slice(0, 10).map((msg, idx) => (
//                                 <div key={idx} className="bg-gray-50 rounded p-3 text-sm">
//                                     <div className="flex items-center justify-between mb-1">
//                                         <span className="font-semibold text-blue-600">{msg.type}</span>
//                                         <span className="text-xs text-gray-500">
//                                             {new Date().toLocaleTimeString()}
//                                         </span>
//                                     </div>
//                                     <pre className="text-xs text-gray-700 overflow-x-auto">
//                                         {JSON.stringify(msg.payload, null, 2)}
//                                     </pre>
//                                 </div>
//                             ))
//                         )}
//                     </div>
//                 </div> */}
//             </main>

//             {/* Create Notification Modal */}
//             <CreateNotificationModal
//                 isOpen={isModalOpen}
//                 onClose={() => setIsModalOpen(false)}
//                 onSuccess={handleNotificationCreated}
//             />
//             <CreateGroupModal
//                 isOpen={isGroupModalOpen}
//                 onClose={() => setIsGroupModalOpen(false)}
//                 onSuccess={loadDashboardData}
//             />

//         </div>
//     );
// }


'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell,
    Users,
    Clock,
    CheckCircle,
    XCircle,
    Activity,
    Send,
    LogOut,
    Wifi,
    WifiOff,
    Plus,
} from 'lucide-react';
import StatsCard from '../components/dashboard/StatsCard';
import NotificationList from '../components/dashboard/NotificationList';
import CreateNotificationModal from '../components/dashboard/CreateNotificationModal';
import CreateGroupModal from '../components/dashboard/CreateGroupModal';
import { useWebSocket } from '../hooks/useWebSocket';
import {
    getDashboardOverview,
    getSentNotifications,
    getReceivedNotifications,
    getQueueStatus,
} from '../lib/api';
import { DashboardOverview, Notification, QueueStats } from '../types';
import NotificationToast from "../components/NotificationToast";

export default function DashboardPage() {
    const router = useRouter();

    const [token, setToken] = useState<string>('');
    const [user, setUser] = useState<any>(null);
    const [overview, setOverview] = useState<DashboardOverview | null>(null);
    const [queue, setqueue] = useState<QueueStats | null>(null);
    const [sentNotifications, setSentNotifications] = useState<Notification[]>([]);
    const [receivedNotifications, setReceivedNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

    // 🔥 WebSocket Hook
    const { isConnected, isAuthenticated, messages } = useWebSocket(token);

    // 🔥 Toast Event
    const [toastEvent, setToastEvent] = useState<any>(null);

    // ---------------------------------------------------
    // Load Local Storage + Dashboard Data
    // ---------------------------------------------------
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (!storedToken) {
            router.push('/');
            return;
        }

        setToken(storedToken);
        setUser(storedUser);
        loadDashboardData();
    }, [router]);

    // ---------------------------------------------------
    // Load Dashboard Data
    // ---------------------------------------------------
    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [overviewData, sentData, receivedData, queueData] = await Promise.all([
                getDashboardOverview(),
                getSentNotifications(1, 10),
                getReceivedNotifications(1, 10),
                getQueueStatus()
            ]);

            setOverview(overviewData.stats);
            setSentNotifications(sentData.notifications);
            setReceivedNotifications(receivedData.notifications);
            setqueue(queueData);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // ---------------------------------------------------
    // Logout Handler
    // ---------------------------------------------------
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    // ---------------------------------------------------
    // After Create Notification
    // ---------------------------------------------------
    const handleNotificationCreated = () => {
        loadDashboardData();
    };

    // ---------------------------------------------------
    // WebSocket Listener for real-time notifications
    // ---------------------------------------------------
    useEffect(() => {
        const newNotifications = messages.filter((msg) => msg.type === 'notification:new');

        if (newNotifications.length > 0) {
            const latest = newNotifications[0];

            // 🔥 Trigger toast popup
            setToastEvent({
                title: latest.payload?.title || "New Notification",
                message: latest.payload?.message || "",
            });

            // Reload dashboard data
            loadDashboardData();
        }
    }, [messages]);

    // ---------------------------------------------------
    // Loader Screen
    // ---------------------------------------------------
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------
    // MAIN UI
    // ---------------------------------------------------
    return (
        <div className="min-h-screen bg-gray-50">

            {/* 🔥 Real-Time Toast */}
            <NotificationToast event={toastEvent} />

            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Notification Dashboard</h1>
                            <p className="text-sm text-gray-600">Welcome back, {user?.username}!</p>
                        </div>

                        <div className="flex items-center gap-4">

                            {/* WebSocket Status */}
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100">
                                {isConnected ? (
                                    <>
                                        <Wifi className="w-4 h-4 text-green-600" />
                                        <span className="text-sm font-medium text-green-600">
                                            {isAuthenticated ? 'Connected & Authenticated' : 'Connected'}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <WifiOff className="w-4 h-4 text-red-600" />
                                        <span className="text-sm font-medium text-red-600">Disconnected</span>
                                    </>
                                )}
                            </div>

                            {/* Create Group */}
                            <button
                                onClick={() => setIsGroupModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Create Group
                            </button>

                            {/* Create Notification */}
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Create Notification
                            </button>

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatsCard title="Total Notifications" value={overview?.totalSent || 0} icon={Bell} color="blue" />
                    <StatsCard title="Pending Notifications" value={overview?.pending || 0} icon={Clock} color="yellow" />
                    <StatsCard title="Scheduled Notifications" value={overview?.scheduled || 0} icon={Activity} color="purple" />
                    <StatsCard title="Delivered Notifications" value={overview?.delivered || 0} icon={CheckCircle} color="green" />
                </div>

                {/* Queue Stats */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Queue Statistics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold">{queue?.waiting || 0}</p>
                            <p className="text-sm text-gray-600">Waiting</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold">{queue?.total || 0}</p>
                            <p className="text-sm text-gray-600">Total</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold">{queue?.completed || 0}</p>
                            <p className="text-sm text-gray-600">Completed</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold">{queue?.failed || 0}</p>
                            <p className="text-sm text-gray-600">Failed</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <Send className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold">{queue?.scheduled || 0}</p>
                            <p className="text-sm text-gray-600">Scheduled</p>
                        </div>
                    </div>
                </div>

                {/* Notifications Lists */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <NotificationList
                        notifications={sentNotifications}
                        title="Sent Notifications"
                    />

                    <NotificationList
                        notifications={receivedNotifications.map((d) => d.notification)}
                        title="Received Notifications"
                    />
                </div>
            </main>

            {/* Modals */}
            <CreateNotificationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleNotificationCreated}
            />

            <CreateGroupModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                onSuccess={loadDashboardData}
            />
        </div>
    );
}
