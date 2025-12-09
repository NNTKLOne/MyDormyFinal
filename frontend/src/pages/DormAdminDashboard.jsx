import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  IconButton,
  Grid,
  Chip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from '../api/axios';

function DormAdminDashboard() {
  const [rooms, setRooms] = useState([]);
  const [dormitories, setDormitories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', severity: 'info' });

  // FILTERS
  const [search, setSearch] = useState("");
  const [filterRoomType, setFilterRoomType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [roomDialog, setRoomDialog] = useState({
    open: false,
    mode: 'create',
    roomId: null,
    dormitory_id: '',
    room_number: '',
    floor: '',
    capacity: '',
    price: '',
    room_type: '',
    description: '',
    amenities: '',
    images: ''
  });

  useEffect(() => {
    fetchDormitories();
    fetchRooms();
  }, []);

  const fetchDormitories = async () => {
    try {
      const res = await axios.get('/api/rooms/dormitories');
      setDormitories(res.data.data);
    } catch (error) {
      console.error('Error fetching dormitories:', error);
    }
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/rooms?status=all');
      setRooms(res.data.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setMessage({ text: 'Klaida įkeliant kambarius', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };


  // -----------------------------
  // FILTERED ROOMS (FRONTEND)
  // -----------------------------

  const filteredRooms = rooms
      .filter((room) => {
        const term = search.toLowerCase();
        return room.room_number.toLowerCase().includes(term);
      })
      .filter((room) => {
        if (filterRoomType === "ALL") return true;
        return room.room_type === filterRoomType;
      })
      .filter((room) => {
        if (filterStatus === "ALL") return true;
        return room.status === filterStatus;
      })
      .filter((room) => {
        if (minPrice && room.price < Number(minPrice)) return false;
        if (maxPrice && room.price > Number(maxPrice)) return false;
        return true;
      });


  // -----------------------------
  // DIALOG HANDLERS
  // -----------------------------

  const handleOpenDialog = (mode, room = null) => {
    if (mode === 'edit' && room) {
      setRoomDialog({
        open: true,
        mode: 'edit',
        roomId: room.id,
        dormitory_id: room.dormitory_id,
        room_number: room.room_number,
        floor: room.floor || '',
        capacity: room.capacity,
        price: room.price,
        room_type: room.room_type || '',
        description: room.description || '',
        amenities: Array.isArray(room.amenities) ? room.amenities.join(', ') : '',
        images: Array.isArray(room.images) ? room.images.join(', ') : ''
      });
    } else {
      setRoomDialog({
        open: true,
        mode: 'create',
        roomId: null,
        dormitory_id: '',
        room_number: '',
        floor: '',
        capacity: '',
        price: '',
        room_type: '',
        description: '',
        amenities: '',
        images: ''
      });
    }
  };

  const handleCloseDialog = () => {
    setRoomDialog({ ...roomDialog, open: false });
  };

  const handleSaveRoom = async () => {
    try {
      const amenitiesArray = roomDialog.amenities
          ? roomDialog.amenities.split(',').map(a => a.trim()).filter(a => a)
          : [];

      const imagesArray = roomDialog.images
          ? roomDialog.images.split(',').map(i => i.trim()).filter(i => i)
          : [];

      const data = {
        dormitory_id: roomDialog.dormitory_id,
        room_number: roomDialog.room_number,
        floor: parseInt(roomDialog.floor) || null,
        capacity: parseInt(roomDialog.capacity),
        price: parseFloat(roomDialog.price),
        room_type: roomDialog.room_type || null,
        description: roomDialog.description || null,
        amenities: amenitiesArray,
        images: imagesArray
      };

      if (roomDialog.mode === 'create') {
        await axios.post('/api/rooms', data);
        setMessage({ text: 'Kambarys sukurtas', severity: 'success' });
      } else {
        await axios.put(`/api/rooms/${roomDialog.roomId}`, data);
        setMessage({ text: 'Kambarys atnaujintas', severity: 'success' });
      }

      handleCloseDialog();
      fetchRooms();
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Klaida išsaugant kambarį',
        severity: 'error'
      });
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!confirm('Ar tikrai norite ištrinti šį kambarį?')) return;

    try {
      await axios.delete(`/api/rooms/${roomId}`);
      setMessage({ text: 'Kambarys ištrintas', severity: 'success' });
      fetchRooms();
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Klaida trinant kambarį',
        severity: 'error'
      });
    }
  };


  const getStatusChip = (status) => {
    const map = {
      'AVAILABLE': { label: 'Laisvas', color: 'success' },
      'RESERVED': { label: 'Rezervuotas', color: 'warning' },
      'OCCUPIED': { label: 'Užimtas', color: 'error' }
    };
    const { label, color } = map[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };


  return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            Kambarių valdymas
          </Typography>
          <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('create')}
          >
            Sukurti kambarį
          </Button>
        </Box>

        {/* FILTER BAR */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <TextField
              label="Paieška"
              placeholder="Kambario nr., bendrabutis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 300 }}
          />

          <TextField
              select
              label="Tipas"
              value={filterRoomType}
              onChange={(e) => setFilterRoomType(e.target.value)}
              sx={{ width: 200 }}
          >
            <MenuItem value="ALL">Visi</MenuItem>
            <MenuItem value="Vienvietis">Vienvietis</MenuItem>
            <MenuItem value="Dvivietis">Dvivietis</MenuItem>
            <MenuItem value="Trivietis">Trivietis</MenuItem>
          </TextField>

          <TextField
              select
              label="Būsena"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              sx={{ width: 200 }}
          >
            <MenuItem value="ALL">Visos</MenuItem>
            <MenuItem value="AVAILABLE">Laisvas</MenuItem>
            <MenuItem value="RESERVED">Rezervuotas</MenuItem>
            <MenuItem value="OCCUPIED">Užimtas</MenuItem>
          </TextField>

          <TextField
              label="Min kaina"
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              sx={{ width: 150 }}
          />

          <TextField
              label="Max kaina"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              sx={{ width: 150 }}
          />
        </Box>


        {message.text && (
            <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage({ text: '', severity: 'info' })}>
              {message.text}
            </Alert>
        )}

        {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
        ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Kambarys</TableCell>
                    <TableCell>Bendrabutis</TableCell>
                    <TableCell>Aukštas</TableCell>
                    <TableCell>Tipas</TableCell>
                    <TableCell>Vietų</TableCell>
                    <TableCell>Užimta</TableCell>
                    <TableCell>Laisva</TableCell>
                    <TableCell>Kaina</TableCell>
                    <TableCell>Būsena</TableCell>
                    <TableCell>Veiksmai</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell>{room.room_number}</TableCell>
                        <TableCell>{room.dormitory_name}</TableCell>
                        <TableCell>{room.floor || '-'}</TableCell>
                        <TableCell>{room.room_type || '-'}</TableCell>
                        <TableCell>{room.capacity}</TableCell>
                        <TableCell>{room.occupied_beds || 0}</TableCell>
                        <TableCell>{room.available_beds}</TableCell>
                        <TableCell>€{room.price}</TableCell>
                        <TableCell>{getStatusChip(room.status)}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleOpenDialog('edit', room)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteRoom(room.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
        )}

        {/* Dialog */}
        <Dialog open={roomDialog.open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {roomDialog.mode === 'create' ? 'Sukurti kambarį' : 'Redaguoti kambarį'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                    select
                    fullWidth
                    required
                    label="Bendrabutis"
                    value={roomDialog.dormitory_id}
                    sx={{ minWidth: 200 }}
                    onChange={(e) => setRoomDialog({ ...roomDialog, dormitory_id: e.target.value })}
                >
                  {dormitories.map((dorm) => (
                      <MenuItem key={dorm.id} value={dorm.id}>
                        {dorm.name}
                      </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                    fullWidth
                    required
                    label="Kambario numeris"
                    value={roomDialog.room_number}
                    onChange={(e) => setRoomDialog({ ...roomDialog, room_number: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                    fullWidth
                    required
                    label="Aukštas"
                    type="number"
                    value={roomDialog.floor}
                    onChange={(e) => setRoomDialog({ ...roomDialog, floor: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                    fullWidth
                    required
                    label="Vietų skaičius"
                    type="number"
                    value={roomDialog.capacity}
                    onChange={(e) => setRoomDialog({ ...roomDialog, capacity: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                    fullWidth
                    required
                    label="Kaina (€/mėn)"
                    type="number"
                    value={roomDialog.price}
                    onChange={(e) => setRoomDialog({ ...roomDialog, price: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                    select
                    fullWidth
                    required
                    label="Kambario tipas"
                    value={roomDialog.room_type}
                    sx={{ minWidth: 200 }}
                    onChange={(e) => setRoomDialog({ ...roomDialog, room_type: e.target.value })}
                >
                  <MenuItem value="Vienvietis">Vienvietis</MenuItem>
                  <MenuItem value="Dvivietis">Dvivietis</MenuItem>
                  <MenuItem value="Trivietis">Trivietis</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Aprašymas"
                    value={roomDialog.description}
                    onChange={(e) => setRoomDialog({ ...roomDialog, description: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                    fullWidth
                    label="Patogumai (atskirti kableliais)"
                    value={roomDialog.amenities}
                    onChange={(e) => setRoomDialog({ ...roomDialog, amenities: e.target.value })}
                    placeholder="WiFi, TV, Balkonas, Vonia"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                    fullWidth
                    label="Nuotraukų URL (atskirti kableliais)"
                    value={roomDialog.images}
                    onChange={(e) => setRoomDialog({ ...roomDialog, images: e.target.value })}
                    placeholder="https://image1.jpg, https://image2.jpg"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Atšaukti</Button>
            <Button
                onClick={handleSaveRoom}
                variant="contained"
                disabled={!roomDialog.dormitory_id || !roomDialog.room_number || !roomDialog.capacity || !roomDialog.price}
            >
              {roomDialog.mode === 'create' ? 'Sukurti' : 'Išsaugoti'}
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
  );
}

export default DormAdminDashboard;
