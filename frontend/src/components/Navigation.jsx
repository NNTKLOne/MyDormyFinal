import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  RequestPage as RequestIcon,
  CalendarMonth as CalendarIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as SupervisorIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Notifications from './Notifications';

function Navigation() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const getMenuItems = () => {
    if (!user) return [];

    const commonItems = [
      { text: 'Pagrindinis', icon: <HomeIcon />, path: '/' },
      { text: 'Kambarių paieška', icon: <SearchIcon />, path: '/rooms' }
    ];

    if (user.user_type === 'STUDENT') {
      return [
        ...commonItems,
        { text: 'Mano informacija', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Rezervuoti kambarį', icon: <SearchIcon />, path: '/rooms' },
        { text: 'Pateikti prašymą', icon: <RequestIcon />, path: '/submit-request' },
        { text: 'Užsiregistruoti apžiūrai', icon: <CalendarIcon />, path: '/book-inspection' }
      ];
    }

    if (user.user_type === 'UNIVERSITY_ADMIN') {
      return [
        ...commonItems,
        { text: 'Admin skydelis', icon: <AdminIcon />, path: '/admin' }
      ];
    }

    if (user.user_type === 'SUPERVISOR') {
      return [
        ...commonItems,
        { text: 'Budėtojo skydelis', icon: <SupervisorIcon />, path: '/supervisor' }
      ];
    }

    return commonItems;
  };

  const menuItems = getMenuItems();

  const drawer = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6">MyDormy</Typography>
        {user && (
          <Typography variant="body2">
            {user.first_name} {user.last_name}
          </Typography>
        )}
      </Box>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Atsijungti" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  if (!user) return null;

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MyDormy
          </Typography>

          {/* Desktop menu */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, mr: 2 }}>
            {menuItems.slice(0, 4).map((item) => (
              <Button
                key={item.text}
                color="inherit"
                onClick={() => navigate(item.path)}
                sx={{
                  borderBottom: location.pathname === item.path ? 2 : 0,
                  borderRadius: 0
                }}
              >
                {item.text}
              </Button>
            ))}
          </Box>

          <Notifications />

          <Typography sx={{ ml: 2, display: { xs: 'none', sm: 'block' } }}>
            {user.first_name} {user.last_name}
          </Typography>

          <Button
            color="inherit"
            onClick={handleLogout}
            sx={{ ml: 2, display: { xs: 'none', md: 'block' } }}
          >
            Atsijungti
          </Button>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        {drawer}
      </Drawer>
    </>
  );
}

export default Navigation;
