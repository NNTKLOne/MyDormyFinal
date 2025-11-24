import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  AppBar,
  Toolbar,
  Box,
  Chip,
  TextField,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dormitories, setDormitories] = useState([]);
  const [filters, setFilters] = useState({
    dormitory_id: '',
    min_price: '',
    max_price: '',
    status: 'AVAILABLE'
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDormitories();
    fetchRooms();
  }, [filters]);

  const fetchDormitories = async () => {
    try {
      const response = await axios.get('/api/rooms/dormitories');
      setDormitories(response.data.data);
    } catch (error) {
      console.error('Error fetching dormitories:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(`/api/rooms?${params.toString()}`);
      setRooms(response.data.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReserveRoom = async (roomId) => {
    if (!user) {
      setSnackbar({
        open: true,
        message: 'Prašome prisijungti norint rezervuoti kambarį',
        severity: 'warning'
      });
      navigate('/login');
      return;
    }

    try {
      setSnackbar({
        open: true,
        message: `Kambarys #${roomId} sėkmingai rezervuotas! (Demo versija)`,
        severity: 'success'
      });

      setTimeout(() => {
        fetchRooms();
      }, 1000);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Klaida rezervuojant kambarį',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'success';
      case 'RESERVED': return 'warning';
      case 'OCCUPIED': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'Laisvas';
      case 'RESERVED': return 'Rezervuotas';
      case 'OCCUPIED': return 'Užimtas';
      default: return status;
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MyDormy - Kambarių paieška
          </Typography>
          {user && (
            <>
              <Typography sx={{ mr: 2 }}>
                {user.first_name} {user.last_name}
              </Typography>
              <Button color="inherit" onClick={handleLogout}>
                Atsijungti
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4, mb: 4 }}>
        {/* Filtrai */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Bendrabutis"
                value={filters.dormitory_id}
                onChange={(e) => setFilters({ ...filters, dormitory_id: e.target.value })}
              >
                <MenuItem value="">Visi</MenuItem>
                {dormitories.map((dorm) => (
                  <MenuItem key={dorm.id} value={dorm.id}>
                    {dorm.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Min. kaina (€)"
                type="number"
                value={filters.min_price}
                onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Maks. kaina (€)"
                type="number"
                value={filters.max_price}
                onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Būsena"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="">Visos</MenuItem>
                <MenuItem value="AVAILABLE">Laisvi</MenuItem>
                <MenuItem value="RESERVED">Rezervuoti</MenuItem>
                <MenuItem value="OCCUPIED">Užimti</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Box>

        {/* Kambarių sąrašas */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {rooms.length === 0 ? (
              <Grid item xs={12}>
                <Typography align="center" color="text.secondary">
                  Kambarių nerasta
                </Typography>
              </Grid>
            ) : (
              rooms.map((room) => (
                <Grid item xs={12} sm={6} md={4} key={room.id}>
                  <Card>
                    <CardMedia
                      component="div"
                      sx={{
                        height: 180,
                        bgcolor: 'grey.300',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography variant="h3" color="grey.600">
                        {room.room_number}
                      </Typography>
                    </CardMedia>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="h6">
                          Kambarys {room.room_number}
                        </Typography>
                        <Chip 
                          label={getStatusText(room.status)} 
                          color={getStatusColor(room.status)} 
                          size="small" 
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {room.dormitory_name}
                      </Typography>
                      
                      <Typography variant="h5" color="primary" sx={{ mt: 2 }}>
                        €{room.price}/mėn
                      </Typography>
                      
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        🛏️ Vietų: {room.capacity}
                      </Typography>
                      
                      <Typography variant="body2">
                        🏢 Aukštas: {room.floor || 'N/A'}
                      </Typography>

                      {room.amenities && room.amenities.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          {room.amenities.slice(0, 3).map((amenity, index) => (
                            <Chip 
                              key={index} 
                              label={amenity} 
                              size="small" 
                              sx={{ mr: 0.5, mt: 0.5 }} 
                            />
                          ))}
                        </Box>
                      )}

                      <Button 
                        variant="contained" 
                        fullWidth 
                        sx={{ mt: 2 }}
                        disabled={room.status !== 'AVAILABLE'}
                        onClick={() => handleReserveRoom(room.id)}
                      >
                        {room.status === 'AVAILABLE' ? 'Rezervuoti' : 'Nepasiekiamas'}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}
      </Container>

      {/* Snackbar pranešimams */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default RoomsPage;