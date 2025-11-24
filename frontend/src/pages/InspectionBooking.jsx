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
  CircularProgress
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function InspectionBooking() {
  const [rooms, setRooms] = useState([]);
  const [dormitories, setDormitories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', severity: 'info' });
  
  const [formData, setFormData] = useState({
    dormitory_id: '',
    room_id: '',
    inspection_date: '',
    inspection_time: '14:00'
  });

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDormitories();
  }, []);

  useEffect(() => {
    if (formData.dormitory_id) {
      fetchRooms();
    }
  }, [formData.dormitory_id]);

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
      const res = await axios.get(`/api/rooms?dormitory_id=${formData.dormitory_id}`);
      setRooms(res.data.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.room_id || !formData.inspection_date || !formData.inspection_time) {
      setMessage({ text: 'Prašome užpildyti visus laukus', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/inspections', {
        room_id: formData.room_id,
        inspection_date: formData.inspection_date,
        inspection_time: formData.inspection_time + ':00'
      });

      setMessage({
        text: 'Apžiūros laikas sėkmingai užregistruotas! Laukite budėtojo patvirtinimo.',
        severity: 'success'
      });

      // Reset form
      setFormData({
        dormitory_id: '',
        room_id: '',
        inspection_date: '',
        inspection_time: '14:00'
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Klaida registruojant apžiūrą',
        severity: 'error'
      });
    } finally {
      setLoading(false);
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

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Užsiregistruoti kambario apžiūrai
      </Typography>

      {message.text && (
        <Alert severity={message.severity} sx={{ mb: 3 }} onClose={() => setMessage({ text: '', severity: 'info' })}>
          {message.text}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Pasirinkite bendrabutį"
                  value={formData.dormitory_id}
                  onChange={(e) => setFormData({ ...formData, dormitory_id: e.target.value, room_id: '' })}
                >
                  <MenuItem value="">Pasirinkite...</MenuItem>
                  {dormitories.map((dorm) => (
                    <MenuItem key={dorm.id} value={dorm.id}>
                      {dorm.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Pasirinkite kambarį"
                  value={formData.room_id}
                  onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                  disabled={!formData.dormitory_id}
                >
                  <MenuItem value="">Pasirinkite...</MenuItem>
                  {rooms.map((room) => (
                    <MenuItem key={room.id} value={room.id}>
                      Kambarys {room.room_number} - €{room.price}/mėn ({room.status})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="Apžiūros data"
                  value={formData.inspection_date}
                  onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: today }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Apžiūros laikas"
                  value={formData.inspection_time}
                  onChange={(e) => setFormData({ ...formData, inspection_time: e.target.value })}
                >
                  {timeSlots.map((time) => (
                    <MenuItem key={time} value={time}>
                      {time}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    ℹ️ Po registracijos, budėtojas turi patvirtinti apžiūros laiką. Gausite pranešimą apie sprendimą.
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Užsiregistruoti apžiūrai'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default InspectionBooking;
