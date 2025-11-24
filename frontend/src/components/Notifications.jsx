import { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Badge,
  Divider,
  Button,
  Chip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Close as CloseIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function Notifications() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get('/api/notifications/unread-count');
      setUnreadCount(res.data.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    fetchNotifications();
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/notifications/${id}`);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getTypeColor = (type) => {
    const colorMap = {
      'INFO': 'info',
      'SUCCESS': 'success',
      'WARNING': 'warning',
      'ERROR': 'error',
      'RESERVATION': 'primary',
      'INSPECTION': 'secondary',
      'REQUEST': 'warning',
      'CONTRACT': 'success'
    };
    return colorMap[type] || 'default';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ką tik';
    if (diffMins < 60) return `Prieš ${diffMins} min`;
    if (diffHours < 24) return `Prieš ${diffHours} val`;
    if (diffDays < 7) return `Prieš ${diffDays} d`;
    return date.toLocaleDateString('lt-LT');
  };

  if (!user) return null;

  return (
    <>
      {/* Notification Bell Icon */}
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      {/* Notifications Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 400 } }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Pranešimai
          </Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Pranešimų nėra
            </Typography>
          </Box>
        ) : (
          <List sx={{ pt: 0 }}>
            {notifications.map((notification, index) => (
              <Box key={notification.id}>
                <ListItem
                  sx={{
                    bgcolor: notification.status === 'UNSEEN' ? 'action.hover' : 'transparent',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    '&:hover': {
                      bgcolor: 'action.selected'
                    }
                  }}
                >
                  <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip
                      label={notification.type}
                      color={getTypeColor(notification.type)}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(notification.created_at)}
                    </Typography>
                  </Box>

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {notification.title}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {notification.message}
                  </Typography>

                  <Box sx={{ width: '100%', display: 'flex', gap: 1 }}>
                    {notification.status === 'UNSEEN' && (
                      <Button
                        size="small"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        Pažymėti kaip perskaityta
                      </Button>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(notification.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Drawer>
    </>
  );
}

export default Notifications;
