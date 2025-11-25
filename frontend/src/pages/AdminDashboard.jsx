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
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', severity: 'info' });
  const [userDialog, setUserDialog] = useState({
    open: false,
    first_name: '',
    last_name: '',
    email: '',
    user_type: 'STUDENT',
    faculty: '',
    study_program: '',
    student_id: '',
    phone: '',
    address: ''
  });
  const [tempPassword, setTempPassword] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ text: 'Klaida įkeliant vartotojus', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setUserDialog({
      open: true,
      first_name: '',
      last_name: '',
      email: '',
      user_type: 'STUDENT',
      faculty: '',
      study_program: '',
      student_id: '',
      phone: '',
      address: ''
    });
    setTempPassword('');
  };

  const handleCloseDialog = () => {
    setUserDialog({ ...userDialog, open: false });
    setTempPassword('');
  };

  const handleCreateUser = async () => {
    try {

      const isStudent = userDialog.user_type === 'STUDENT';

      const response = await axios.post('/api/users', {
        first_name: userDialog.first_name,
        last_name: userDialog.last_name,
        email: userDialog.email,
        user_type: userDialog.user_type,
        faculty: userDialog.faculty || null,
        study_program: userDialog.study_program || null,
        student_id: userDialog.student_id || null,
        phone: userDialog.phone || null,
        address: isStudent ? null : (userDialog.address || null)
      });

      setTempPassword(response.data.data.temporaryPassword);
      setMessage({
        text: 'Paskyra sėkmingai sukurta!',
        severity: 'success'
      });

      fetchUsers();
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
      fetchUsers();
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.message || 'Klaida trinant vartotoją', 
        severity: 'error' 
      });
    }
  };

  const handleFinalClose = () => {
    handleCloseDialog();
    fetchUsers();
  };

  const getUserTypeLabel = (type) => {
    const labels = {
      'STUDENT': 'Studentas',
      'UNIVERSITY_ADMIN': 'Univ. Admin',
      'DORMITORY_ADMIN': 'Bendr. Admin',
      'SUPERVISOR': 'Budėtojas',
      'RESIDENT': 'Gyventojas'
    };
    return labels[type] || type;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Vartotojų valdymas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Sukurti paskyrą
        </Button>
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
                <TableCell>Vardas</TableCell>
                <TableCell>Pavardė</TableCell>
                <TableCell>El. paštas</TableCell>
                <TableCell>Tipas</TableCell>
                <TableCell>Fakultetas</TableCell>
                <TableCell>Studijų programa</TableCell>
                <TableCell>Stud. ID</TableCell>
                <TableCell>Telefonas</TableCell>
                <TableCell>Aktyvus</TableCell>
                <TableCell>Veiksmai</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.first_name}</TableCell>
                  <TableCell>{user.last_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getUserTypeLabel(user.user_type)}</TableCell>
                  <TableCell>{user.faculty || '-'}</TableCell>
                  <TableCell>{user.study_program || '-'}</TableCell>
                  <TableCell>{user.student_id || '-'}</TableCell>
                  <TableCell>{user.phone || '-'}</TableCell>
                  <TableCell>{user.is_active ? '✓' : '✗'}</TableCell>
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

      {/* User Creation Dialog */}
      <Dialog open={userDialog.open} onClose={tempPassword ? handleFinalClose : handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {tempPassword ? 'Paskyra sukurta!' : 'Sukurti naują paskyrą'}
        </DialogTitle>
        <DialogContent>
          {tempPassword ? (
            <Box sx={{ mt: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Paskyra sėkmingai sukurta!
              </Alert>
              <Typography variant="h6" gutterBottom>
                Laikinas slaptažodis:
              </Typography>
              <TextField
                fullWidth
                value={tempPassword}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ 
                  mb: 2,
                  '& .MuiInputBase-input': {
                    fontSize: '1.2rem',
                    fontFamily: 'monospace',
                    fontWeight: 'bold'
                  }
                }}
              />
              <Alert severity="warning">
                SVARBU: Išsaugokite šį slaptažodį! Jis nebus rodomas dar kartą. 
                Vartotojas turės pakeisti slaptažodį pirmą kartą prisijungęs.
              </Alert>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Vardas"
                  value={userDialog.first_name}
                  onChange={(e) => setUserDialog({ ...userDialog, first_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Pavardė"
                  value={userDialog.last_name}
                  onChange={(e) => setUserDialog({ ...userDialog, last_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="El. paštas"
                  type="email"
                  value={userDialog.email}
                  onChange={(e) => setUserDialog({ ...userDialog, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Vartotojo tipas"
                  value={userDialog.user_type}
                  onChange={(e) => setUserDialog({ ...userDialog, user_type: e.target.value })}
                >
                  <MenuItem value="STUDENT">Studentas</MenuItem>
                  <MenuItem value="SUPERVISOR">Budėtojas</MenuItem>
                  <MenuItem value="DORMITORY_ADMIN">Bendrabučio administratorius</MenuItem>
                  <MenuItem value="UNIVERSITY_ADMIN">Universiteto administratorius</MenuItem>
                </TextField>
              </Grid>
              {userDialog.user_type === 'STUDENT' && (
                <>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      required
                      label="Fakultetas"
                      value={userDialog.faculty}
                      onChange={(e) => setUserDialog({ ...userDialog, faculty: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      required
                      label="Studijų programa"
                      value={userDialog.study_program}
                      onChange={(e) => setUserDialog({ ...userDialog, study_program: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      required
                      label="Studento ID"
                      value={userDialog.student_id}
                      onChange={(e) => setUserDialog({ ...userDialog, student_id: e.target.value })}
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefonas"
                  value={userDialog.phone}
                  onChange={(e) => setUserDialog({ ...userDialog, phone: e.target.value })}
                />
              </Grid>
              {userDialog.user_type !== 'STUDENT' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Adresas"
                  value={userDialog.address}
                  onChange={(e) => setUserDialog({ ...userDialog, address: e.target.value })}
                />
              </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {tempPassword ? (
            <Button onClick={handleFinalClose} variant="contained">
              Uždaryti
            </Button>
          ) : (
            <>
              <Button onClick={handleCloseDialog}>Atšaukti</Button>
              <Button
                onClick={handleCreateUser}
                variant="contained"
                disabled={!userDialog.first_name || !userDialog.last_name || !userDialog.email}
              >
                Sukurti
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminDashboard;
