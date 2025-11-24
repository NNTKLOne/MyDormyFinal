import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  CardMedia,
  Chip
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function RequestSubmission() {
  const [rooms, setRooms] = useState([]);
  const [dormitories, setDormitories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', severity: 'info' });
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  const [filters, setFilters] = useState({
    dormitory_id: '',
    status: 'AVAILABLE'
  });

  const { user } = useAuth();
  const navigate = useNavigate();

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
      const params = new URLSearchParams();
      if (filters.dormitory_id) params.append('dormitory_id', filters.dormitory_id);
      if (filters.status) params.append('status', filters.status);

      const res = await axios.get(`/api/rooms?${params.toString()}`);
      setRooms(res.data.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedRoom) {
      setMessage({ text: 'Prašome pasirinkti kambarį', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/requests', {
        room_id: selectedRoom.id,
        documents: {}
      });

      setMessage({
        text: 'Prašymas sėkmingai pateiktas! Laukite administratoriaus sprendimo.',
        severity: 'success'
      });

      setSelectedRoom(null);

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Klaida pateikiant prašymą',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    return status === 'AVAILABLE' ? 'success' : 'warning';
  };

  const getStatusText = (status) => {
    return status === 'AVAILABLE' ? 'Laisvas' : status;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Pateikti apgyvendinimo prašymą
      </Typography>

      {message.text && (
        <Alert severity={message.severity} sx={{ mb: 3 }} onClose={() => setMessage({ text: '', severity: 'info' })}>
          {message.text}
        </Alert>
      )}

      {/* Filtrai */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
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
        </Grid>
      </Box>

      {/* Pasirinktas kambarys */}
      {selectedRoom && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'white' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pasirinktas kambarys:
            </Typography>
            <Typography variant="h5">
              Kambarys {selectedRoom.room_number} - {selectedRoom.dormitory_name}
            </Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>
              €{selectedRoom.price}/mėn
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                size="large"
                color="secondary"
                onClick={handleSubmitRequest}
                disabled={loading}
                sx={{ mr: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Pateikti prašymą'}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => setSelectedRoom(null)}
                sx={{ color: 'white', borderColor: 'white' }}
              >
                Atšaukti
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Kambarių sąrašas */}
      <Typography variant="h6" gutterBottom>
        Pasirinkite kambarį:
      </Typography>

      <Grid container spacing={3}>
        {rooms.length === 0 ? (
          <Grid item xs={12}>
            <Alert severity="info">Kambarių nerasta</Alert>
          </Grid>
        ) : (
          rooms.map((room) => (
            <Grid item xs={12} sm={6} md={4} key={room.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border: selectedRoom?.id === room.id ? 3 : 0,
                  borderColor: 'primary.main',
                  '&:hover': {
                    boxShadow: 6
                  }
                }}
                onClick={() => setSelectedRoom(room)}
              >
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
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Container>
  );
}

export default RequestSubmission;
