import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  IconButton
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function AdminDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', severity: 'info' });
  
  // User creation dialog
  const [userDialog, setUserDialog] = useState({
    open: false,
    firstName: '',
    lastName: '',
    email: '',
    userType: 'STUDENT',
    faculty: '',
    studyProgram: '',
    phone: '',
    address: ''
  });

  // Request review dialog
  const [reviewDialog, setReviewDialog] = useState({
    open: false,
    requestId: null,
    action: '',
    rejectionReason: ''
  });

  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, [tabValue]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tabValue === 0) {
        const res = await axios.get('/api/requests');
        setRequests(res.data.data);
      } else if (tabValue === 1) {
        const res = await axios.get('/api/users');
        setUsers(res.data.data);
      } else if (tabValue === 2) {
        const res = await axios.get('/api/rooms');
        setRooms(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ text: 'Klaida įkeliant duomenis', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReviewDialog = (requestId, action) => {
    setReviewDialog({
      open: true,
      requestId,
      action,
      rejectionReason: ''
    });
  };

  const handleCloseReviewDialog = () => {
    setReviewDialog({
      open: false,
      requestId: null,
      action: '',
      rejectionReason: ''
    });
  };

  const handleReviewRequest = async () => {
    try {
      await axios.put(`/api/requests/${reviewDialog.requestId}/status`, {
        status: reviewDialog.action,
        rejection_reason: reviewDialog.rejectionReason
      });

      setMessage({
        text: `Prašymas ${reviewDialog.action === 'APPROVED' ? 'patvirtintas' : 'atmestas'}`,
        severity: 'success'
      });

      handleCloseReviewDialog();
      fetchData();
    } catch (error) {
      setMessage({ text: 'Klaida apdorojant prašymą', severity: 'error' });
    }
  };

  const handleOpenUserDialog = () => {
    setUserDialog({
      open: true,
      firstName: '',
      lastName: '',
      email: '',
      userType: 'STUDENT',
      faculty: '',
      studyProgram: '',
      phone: '',
      address: ''
    });
  };

  const handleCloseUserDialog = () => {
    setUserDialog({
      ...userDialog,
      open: false
    });
  };

  const handleCreateUser = async () => {
    try {
      const response = await axios.post('/api/users', {
        first_name: userDialog.firstName,
        last_name: userDialog.lastName,
        email: userDialog.email,
        user_type: userDialog.userType,
        faculty: userDialog.faculty,
        study_program: userDialog.studyProgram,
        phone: userDialog.phone,
        address: userDialog.address
      });

      setMessage({
        text: `Paskyra sukurta! Laikinas slaptažodis: ${response.data.data.temporaryPassword}`,
        severity: 'success'
      });

      handleCloseUserDialog();
      fetchData();
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Klaida kuriant paskyrą',
        severity: 'error'
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Ar tikrai norite ištrinti šį vartotoją?')) return;

    try {
      await axios.delete(`/api/users/${userId}`);
      setMessage({ text: 'Vartotojas ištrintas', severity: 'success' });
      fetchData();
    } catch (error) {
      setMessage({ text: 'Klaida trinant vartotoją', severity: 'error' });
    }
  };

  const getStatusChip = (status) => {
    const statusMap = {
      'SUBMITTED': { label: 'Pateikta', color: 'info' },
      'UNDER_REVIEW': { label: 'Peržiūrima', color: 'warning' },
      'APPROVED': { label: 'Patvirtinta', color: 'success' },
      'REJECTED': { label: 'Atmesta', color: 'error' }
    };

    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Administratoriaus skydelis
        </Typography>
        {tabValue === 1 && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenUserDialog}
          >
            Sukurti paskyrą
          </Button>
        )}
      </Box>

      {message.text && (
        <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage({ text: '', severity: 'info' })}>
          {message.text}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Prašymai" />
          <Tab label="Vartotojai" />
          <Tab label="Kambariai" />
        </Tabs>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Prašymai */}
          {tabValue === 0 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Studentas</TableCell>
                    <TableCell>El. paštas</TableCell>
                    <TableCell>Fakultetas</TableCell>
                    <TableCell>Kambarys</TableCell>
                    <TableCell>Bendrabutis</TableCell>
                    <TableCell>Pateikta</TableCell>
                    <TableCell>Būsena</TableCell>
                    <TableCell>Veiksmai</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        Prašymų nėra
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.first_name} {request.last_name}</TableCell>
                        <TableCell>{request.email}</TableCell>
                        <TableCell>{request.faculty || '-'}</TableCell>
                        <TableCell>{request.room_number}</TableCell>
                        <TableCell>{request.dormitory_name}</TableCell>
                        <TableCell>{new Date(request.submitted_at).toLocaleDateString('lt-LT')}</TableCell>
                        <TableCell>{getStatusChip(request.status)}</TableCell>
                        <TableCell>
                          {request.status === 'SUBMITTED' && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => handleOpenReviewDialog(request.id, 'APPROVED')}
                              >
                                Patvirtinti
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                onClick={() => handleOpenReviewDialog(request.id, 'REJECTED')}
                              >
                                Atmesti
                              </Button>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Vartotojai */}
          {tabValue === 1 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vardas</TableCell>
                    <TableCell>Pavardė</TableCell>
                    <TableCell>El. paštas</TableCell>
                    <TableCell>Tipas</TableCell>
                    <TableCell>Fakultetas</TableCell>
                    <TableCell>Studijų programa</TableCell>
                    <TableCell>Telefonas</TableCell>
                    <TableCell>Veiksmai</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.first_name}</TableCell>
                      <TableCell>{user.last_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.user_type}</TableCell>
                      <TableCell>{user.faculty || '-'}</TableCell>
                      <TableCell>{user.study_program || '-'}</TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => handleDeleteUser(user.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Kambariai */}
          {tabValue === 2 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Kambarys</TableCell>
                    <TableCell>Bendrabutis</TableCell>
                    <TableCell>Aukštas</TableCell>
                    <TableCell>Vietų</TableCell>
                    <TableCell>Kaina</TableCell>
                    <TableCell>Būsena</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell>{room.room_number}</TableCell>
                      <TableCell>{room.dormitory_name}</TableCell>
                      <TableCell>{room.floor}</TableCell>
                      <TableCell>{room.capacity}</TableCell>
                      <TableCell>€{room.price}</TableCell>
                      <TableCell>{room.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onClose={handleCloseReviewDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {reviewDialog.action === 'APPROVED' ? 'Patvirtinti prašymą' : 'Atmesti prašymą'}
        </DialogTitle>
        <DialogContent>
          {reviewDialog.action === 'REJECTED' && (
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Atmetimo priežastis"
              value={reviewDialog.rejectionReason}
              onChange={(e) => setReviewDialog({ ...reviewDialog, rejectionReason: e.target.value })}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReviewDialog}>Atšaukti</Button>
          <Button
            onClick={handleReviewRequest}
            variant="contained"
            color={reviewDialog.action === 'APPROVED' ? 'success' : 'error'}
          >
            Patvirtinti
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Creation Dialog */}
      <Dialog open={userDialog.open} onClose={handleCloseUserDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Sukurti naują paskyrą</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Vardas"
              value={userDialog.firstName}
              onChange={(e) => setUserDialog({ ...userDialog, firstName: e.target.value })}
            />
            <TextField
              fullWidth
              label="Pavardė"
              value={userDialog.lastName}
              onChange={(e) => setUserDialog({ ...userDialog, lastName: e.target.value })}
            />
            <TextField
              fullWidth
              label="El. paštas"
              type="email"
              value={userDialog.email}
              onChange={(e) => setUserDialog({ ...userDialog, email: e.target.value })}
            />
            <TextField
              select
              fullWidth
              label="Vartotojo tipas"
              value={userDialog.userType}
              onChange={(e) => setUserDialog({ ...userDialog, userType: e.target.value })}
            >
              <MenuItem value="STUDENT">Studentas</MenuItem>
              <MenuItem value="SUPERVISOR">Budėtojas</MenuItem>
              <MenuItem value="DORMITORY_ADMIN">Bendrabučio administratorius</MenuItem>
              <MenuItem value="UNIVERSITY_ADMIN">Universiteto administratorius</MenuItem>
            </TextField>
            {userDialog.userType === 'STUDENT' && (
              <>
                <TextField
                  fullWidth
                  label="Fakultetas"
                  value={userDialog.faculty}
                  onChange={(e) => setUserDialog({ ...userDialog, faculty: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Studijų programa"
                  value={userDialog.studyProgram}
                  onChange={(e) => setUserDialog({ ...userDialog, studyProgram: e.target.value })}
                />
              </>
            )}
            <TextField
              fullWidth
              label="Telefonas"
              value={userDialog.phone}
              onChange={(e) => setUserDialog({ ...userDialog, phone: e.target.value })}
            />
            <TextField
              fullWidth
              label="Adresas"
              value={userDialog.address}
              onChange={(e) => setUserDialog({ ...userDialog, address: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUserDialog}>Atšaukti</Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={!userDialog.firstName || !userDialog.lastName || !userDialog.email}
          >
            Sukurti
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminDashboard;
