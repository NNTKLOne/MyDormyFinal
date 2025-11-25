import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  Chip,
  TextField,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [dormitories, setDormitories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dormitory_id: '',
    min_price: '',
    max_price: '',
    capacity: ''
  });
  const [bookingDialog, setBookingDialog] = useState({
    open: false,
    room: null,
    inspection_date: '',
    inspection_time: '14:00'
  });
  const [message, setMessage] = useState({ text: '', severity: 'info' });

  const { user } = useAuth();

  useEffect(() => {
    fetchDormitories();
    fetchRooms();
  }, [filters]);

  const fetchDormitories = async () => {
    try {
      const res = await axios.get('/api/rooms/dormitories');
      setDormitories(res.data.data);
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

      const res = await axios.get(`/api/rooms?${params.toString()}`);
      setRooms(res.data.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setMessage({ text: 'Klaida įkeliant kambarius', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBooking = (room) => {
    if (!user) {
      setMessage({
        text: 'Prašome prisijungti norint užsiregistruoti apžiūrai',
        severity: 'warning'
      });
      return;
    }

    if (user.user_type !== 'STUDENT') {
      setMessage({
        text: 'Tik studentai gali registruotis apžiūrai',
        severity: 'warning'
      });
      return;
    }

    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setBookingDialog({
      open: true,
      room: room,
      inspection_date: tomorrow.toISOString().split('T')[0],
      inspection_time: '14:00'
    });
  };

  const handleCloseBooking = () => {
    setBookingDialog({
      open: false,
      room: null,
      inspection_date: '',
      inspection_time: '14:00'
    });
  };

  const handleConfirmBooking = async () => {
    try {
      await axios.post('/api/inspections', {
        room_id: bookingDialog.room.id,
        inspection_date: bookingDialog.inspection_date,
        inspection_time: bookingDialog.inspection_time + ':00'
      });

      setMessage({
        text: 'Apžiūros užklausa sėkmingai pateikta! Laukite budėtojo patvirtinimo.',
        severity: 'success'
      });

      handleCloseBooking();
      fetchRooms(); // Refresh to show updated status
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Klaida pateikiant užklausą',
        severity: 'error'
      });
    }
  };

  // Generate time slots
  const timeSlots = [];
  for (let hour = 9; hour <= 18; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 18) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const getStatusColor = (room) => {
    const occupied = room.occupied_beds || 0;
    const available = room.available_beds || 0;
    
    if (available === 0) return 'error';
    if (room.status === 'RESERVED') return 'warning';
    return 'success';
  };

  const getStatusText = (room) => {
    const occupied = room.occupied_beds || 0;
    const available = room.available_beds || 0;
    
    if (available === 0) return 'Rezervuota';
    if (room.status === 'RESERVED') return `Rezervuota ${occupied}/${room.capacity}`;
    return `${available} laisva`;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Kambarių paieška
      </Typography>

      {message.text && (
        <Alert severity={message.severity} sx={{ mb: 3 }} onClose={() => setMessage({ text: '', severity: 'info' })}>
          {message.text}
        </Alert>
      )}

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
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Min. kaina (€)"
              type="number"
              value={filters.min_price}
              onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Maks. kaina (€)"
              type="number"
              value={filters.max_price}
              onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="Vietų skaičius"
              value={filters.capacity}
              onChange={(e) => setFilters({ ...filters, capacity: e.target.value })}
            >
              <MenuItem value="">Visi</MenuItem>
              <MenuItem value="1">1 vieta</MenuItem>
              <MenuItem value="2">2 vietos</MenuItem>
              <MenuItem value="3">3 vietos</MenuItem>
              <MenuItem value="4">4+ vietos</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setFilters({
                dormitory_id: '',
                min_price: '',
                max_price: '',
                capacity: ''
              })}
              sx={{ height: '56px' }}
            >
              Išvalyti filtrus
            </Button>
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
              <Alert severity="info">Kambarių nerasta</Alert>
            </Grid>
          ) : (
            rooms.map((room) => {
              const occupied = room.occupied_beds || 0;
              const available = room.available_beds || 0;
              
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={room.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardMedia
                      component="div"
                      sx={{
                        height: 140,
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
                    
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="h6">
                          Kambarys {room.room_number}
                        </Typography>
                        <Chip 
                          label={getStatusText(room)} 
                          color={getStatusColor(room)} 
                          size="small" 
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {room.dormitory_name}
                      </Typography>
                      
                      <Typography variant="h5" color="primary" sx={{ mt: 2 }}>
                        €{room.price}/mėn
                      </Typography>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          🛏️ Užimta: {occupied}/{room.capacity} vietų
                        </Typography>
                        
                        <Typography variant="body2">
                          🏢 Aukštas: {room.floor || 'N/A'}
                        </Typography>

                        {available > 0 && (
                          <Typography variant="body2" sx={{ mt: 1, color: 'success.main', fontWeight: 'bold' }}>
                            ✓ {available} {available === 1 ? 'laisva vieta' : 'laisvos vietos'}
                          </Typography>
                        )}
                      </Box>

                      {room.amenities && room.amenities.length > 0 && (
                        <Box sx={{ mt: 2 }}>
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
                        onClick={() => handleOpenBooking(room)}
                        disabled={!user || user.user_type !== 'STUDENT' || available === 0}
                      >
                        {available === 0 ? 'Nėra vietų' : 'Užsiregistruoti apžiūrai'}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })
          )}
        </Grid>
      )}

      {/* Booking Dialog */}
      <Dialog open={bookingDialog.open} onClose={handleCloseBooking} maxWidth="sm" fullWidth>
        <DialogTitle>
          Užsiregistruoti kambario apžiūrai
        </DialogTitle>
        <DialogContent>
          {bookingDialog.room && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Kambarys {bookingDialog.room.room_number}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {bookingDialog.room.dormitory_name}
              </Typography>
              <Typography variant="body2">
                €{bookingDialog.room.price}/mėn | {bookingDialog.room.available_beds} laisva vieta
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              required
              type="date"
              label="Apžiūros data"
              value={bookingDialog.inspection_date}
              onChange={(e) => setBookingDialog({ ...bookingDialog, inspection_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: minDate }}
            />

            <TextField
              select
              fullWidth
              required
              label="Apžiūros laikas"
              value={bookingDialog.inspection_time}
              onChange={(e) => setBookingDialog({ ...bookingDialog, inspection_time: e.target.value })}
            >
              {timeSlots.map((time) => (
                <MenuItem key={time} value={time}>
                  {time}
                </MenuItem>
              ))}
            </TextField>

            <Alert severity="info">
              Po užsiregistravimo, budėtojas turi patvirtinti apžiūros laiką. Gausite pranešimą apie sprendimą.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBooking}>Atšaukti</Button>
          <Button
            onClick={handleConfirmBooking}
            variant="contained"
            disabled={!bookingDialog.inspection_date || !bookingDialog.inspection_time}
          >
            Patvirtinti
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default RoomsPage;
