'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Clock,
  BookOpen,
  Users,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  category?: 'system' | 'content' | 'user' | 'quiz' | 'general';
  persistent?: boolean; // Won't auto-dismiss
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(parsed);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
  }, []);

  // Save notifications to localStorage
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-dismiss non-persistent notifications after 5 seconds
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, 5000);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
      unreadCount
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
  onMarkAsRead: (id: string) => void;
}

function NotificationItem({ notification, onRemove, onMarkAsRead }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getCategoryIcon = () => {
    switch (notification.category) {
      case 'content': return <BookOpen className="w-4 h-4" />;
      case 'user': return <Users className="w-4 h-4" />;
      case 'quiz': return <BarChart3 className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Card className={cn(
      "mb-2 transition-all duration-200 hover:shadow-md",
      !notification.read && "border-l-4 border-l-blue-500 bg-blue-50"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <div>
              <CardTitle className="text-sm font-medium">{notification.title}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500">
                  {notification.timestamp.toLocaleTimeString()}
                </span>
                {notification.category && (
                  <Badge variant="outline" className="text-xs">
                    {getCategoryIcon()}
                    <span className="ml-1 capitalize">{notification.category}</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {!notification.read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkAsRead(notification.id)}
                className="h-6 w-6 p-0"
                title="Mark as read"
              >
                <CheckCircle className="w-3 h-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(notification.id)}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm">
          {notification.message}
        </CardDescription>
        {notification.action && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (notification.action?.onClick) {
                  notification.action.onClick();
                } else if (notification.action?.href) {
                  window.location.href = notification.action.href;
                }
                onMarkAsRead(notification.id);
              }}
            >
              {notification.action.label}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { 
    notifications, 
    removeNotification, 
    markAsRead, 
    markAllAsRead, 
    clearAll 
  } = useNotifications();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className="fixed right-4 top-16 w-96 max-h-[80vh] bg-white rounded-lg shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center space-x-2">
              {notifications.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-xs"
                  >
                    Clear all
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto p-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRemove={removeNotification}
                onMarkAsRead={markAsRead}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
      
      <NotificationCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

// Utility hooks for common notification patterns
export function useNotificationHelpers() {
  const { addNotification } = useNotifications();

  const notifySuccess = useCallback((title: string, message: string, action?: Notification['action']) => {
    addNotification({
      type: 'success',
      title,
      message,
      action,
      category: 'general'
    });
  }, [addNotification]);

  const notifyError = useCallback((title: string, message: string, persistent = true) => {
    addNotification({
      type: 'error',
      title,
      message,
      persistent,
      category: 'system'
    });
  }, [addNotification]);

  const notifyInfo = useCallback((title: string, message: string, action?: Notification['action']) => {
    addNotification({
      type: 'info',
      title,
      message,
      action,
      category: 'general'
    });
  }, [addNotification]);

  const notifyWarning = useCallback((title: string, message: string) => {
    addNotification({
      type: 'warning',
      title,
      message,
      category: 'system'
    });
  }, [addNotification]);

  // Specific notification types
  const notifyContentUpdate = useCallback((count: number) => {
    notifyInfo(
      'New Content Available',
      `${count} new articles have been added to the platform.`,
      {
        label: 'View Articles',
        href: '/articles'
      }
    );
  }, [notifyInfo]);

  const notifyQuizCompleted = useCallback((score: number, total: number) => {
    notifySuccess(
      'Quiz Completed!',
      `You scored ${score} out of ${total} points.`,
      {
        label: 'View Results',
        href: '/quizzes'
      }
    );
  }, [notifySuccess]);

  const notifyStudentRegistered = useCallback((studentName: string) => {
    notifyInfo(
      'New Student Registered',
      `${studentName} has successfully registered on the platform.`,
      {
        label: 'View Students',
        href: '/admin/students'
      }
    );
  }, [notifyInfo]);

  return {
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,
    notifyContentUpdate,
    notifyQuizCompleted,
    notifyStudentRegistered
  };
}
