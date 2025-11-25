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
    room_type: '',
    floor: '',
    min_free_beds: ''
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

    // pagal vieną vietą apsiskaičiuojam visus skaičius
  const getRoomCounts = (room) => {
    const occupied = room.occupied_beds || 0;                // kiek gyventojų (sutartys)
    const totalFree = Math.max(room.capacity - occupied, 0); // iš viso laisvų lovų
    const reserved = room.reserved_slots || 0;               // kiek iš tų laisvų jau rezervuota apžiūromis
    const available = Math.max(totalFree - reserved, 0);     // kiek dar galima rezervuoti (mygtukui)

    return { occupied, totalFree, reserved, available };
  };

  const getStatusColor = (room) => {
    const { available, reserved, totalFree } = getRoomCounts(room);

    if (totalFree === 0) return 'error';            // kambarys pilnas (gyventojai)
    if (available === 0 && totalFree > 0) return 'error'; // visos laisvos vietos užrezervuotos
    if (reserved > 0) return 'warning';            // yra rezervacijų, bet dar yra laisvų
    return 'success';
  };

    const getStatusText = (room) => {
      const { reserved, totalFree } = getRoomCounts(room);
      
      // studentui rodomi tik kambariai su totalFree > 0
      // todėl visuomet tik rodome rezervacijas
      return `Rezervuota ${reserved}/${totalFree}`;
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
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          {/* Bendrabutis */}
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Bendrabutis"
              value={filters.dormitory_id}
              sx={{ minWidth: 200 }}
              onChange={(e) => setFilters({ ...filters, dormitory_id: e.target.value })}
            >
              <MenuItem value="">Visi bendrabučiai</MenuItem>
              {dormitories.map((dorm) => (
                <MenuItem key={dorm.id} value={dorm.id}>
                  {dorm.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Kaina min */}
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Min kaina"
              type="number"
              value={filters.min_price}
              onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
            />
          </Grid>

          {/* Kaina max */}
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Max kaina"
              type="number"
              value={filters.max_price}
              onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
            />
          </Grid>

          {/* Kambario tipas */}
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Kambario tipas"
              value={filters.room_type}
              sx={{ minWidth: 200 }}
              onChange={(e) => setFilters({ ...filters, room_type: e.target.value })}
            >
              <MenuItem value="">Visi tipai</MenuItem>
              <MenuItem value="Vienvietis">Vienvietis</MenuItem>
              <MenuItem value="Dvivietis">Dvivietis</MenuItem>
              <MenuItem value="Trivietis">Trivietis</MenuItem>
            </TextField>
          </Grid>

          {/* Aukštas */}
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              label="Aukštas"
              value={filters.floor}
              sx={{ minWidth: 200 }}
              onChange={(e) => setFilters({ ...filters, floor: e.target.value })}
            >
              <MenuItem value="">Visi aukštai</MenuItem>
              {Array.from({ length: 15 }, (_, i) => i + 1).map((f) => (
                <MenuItem key={f} value={f}>
                  {f}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Min laisvų vietų skaičius */}
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              label="Min laisvų vietų"
              value={filters.min_free_beds}
              sx={{ minWidth: 200 }}
              onChange={(e) => setFilters({ ...filters, min_free_beds: e.target.value })}
            >
              <MenuItem value="">Nesvarbu</MenuItem>
              <MenuItem value="1">1</MenuItem>
              <MenuItem value="2">2</MenuItem>
              <MenuItem value="3">3</MenuItem>
              <MenuItem value="4">4</MenuItem>
            </TextField>
          </Grid>

          {/* Išvalyti filtrus */}
          <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'stretch' }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() =>
                setFilters({
                  dormitory_id: '',
                  min_price: '',
                  max_price: '',
                  room_type: '',
                  floor: '',
                  min_free_beds: ''
                })
              }
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
              const { occupied, available, totalFree } = getRoomCounts(room);

              const bookingDisabled = available <= 0;

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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6">
                          Kambarys {room.room_number}
                        </Typography>
                        <Chip 
                        sx={{ ml: 2 }}
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
                    </CardContent>
                    
                    <Box sx={{ p: 2, pt: 0, pb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleOpenBooking(room)}
                        disabled={bookingDisabled}
                      >
                        Registruotis apžiūrai
                      </Button>
                    </Box>
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
                €{bookingDialog.room.price}/mėn |{' '}
                {bookingDialog.room.available_beds}{' '}
                {bookingDialog.room.available_beds === 1 ? 'laisva vieta' : 'laisvos vietos'}
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
