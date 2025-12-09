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

import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';

import axios from '../api/axios';

function AdminDashboard() {

  // -----------------------------------
  // STATE
  // -----------------------------------

  const [users, setUsers] = useState([]);
  const [dormitories, setDormitories] = useState([]);

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
    address: '',
    dormitory_id: '',
    is_active: true
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editUserId, setEditUserId] = useState(null);

  const [tempPassword, setTempPassword] = useState('');

  // FILTERS
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterActive, setFilterActive] = useState('ALL');


  // -----------------------------------
  // LOAD USERS + DORMITORIES
  // -----------------------------------

  useEffect(() => {
    fetchUsers();
    fetchDormitories();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);

    try {
      const res = await axios.get('/api/users');
      setUsers(res.data.data);
    } catch (err) {
      setMessage({ text: "Klaida įkeliant vartotojus", severity: "error" });
    }

    setLoading(false);
  };

  const fetchDormitories = async () => {
    try {
      const res = await axios.get('/api/dormitories');
      setDormitories(res.data.data);
    } catch (err) {
      console.error("Error loading dormitories:", err);
    }
  };


  // -----------------------------------
  // OPEN/CLOSE DIALOG
  // -----------------------------------

  const handleOpenDialog = () => {
    setIsEditing(false);
    setEditUserId(null);
    setTempPassword('');

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
      address: '',
      dormitory_id: '',
      is_active: true
    });
  };

  const handleCloseDialog = () => {
    setUserDialog((prev) => ({ ...prev, open: false }));
    setIsEditing(false);
    setEditUserId(null);
    setTempPassword('');
  };


  // -----------------------------------
  // CREATE USER
  // -----------------------------------

  const handleCreateUser = async () => {
    try {
      const isStudent = userDialog.user_type === 'STUDENT';

      const response = await axios.post('/api/users', {
        first_name: userDialog.first_name,
        last_name: userDialog.last_name,
        email: userDialog.email,
        user_type: userDialog.user_type,
        faculty: isStudent ? userDialog.faculty : null,
        study_program: isStudent ? userDialog.study_program : null,
        student_id: isStudent ? userDialog.student_id : null,
        phone: userDialog.phone || null,
        address: isStudent ? null : userDialog.address || null,
        dormitory_id: userDialog.dormitory_id || null
      });

      setTempPassword(response.data.data.temporaryPassword);

      setMessage({ text: "Paskyra sukurta", severity: "success" });
      await fetchUsers();
      await fetchDormitories();

    } catch (err) {
      setMessage({
        text: err.response?.data?.message || "Klaida kuriant",
        severity: "error"
      });
    }
  };


  // -----------------------------------
  // DELETE USER
  // -----------------------------------

  const handleDeleteUser = async (id) => {
    if (!confirm("Ar tikrai norite ištrinti?")) return;

    try {
      await axios.delete(`/api/users/${id}`);
      setMessage({ text: "Vartotojas ištrintas", severity: "success" });
      fetchUsers();
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || "Klaida trinant",
        severity: "error"
      });
    }
  };

  // -----------------------------------
  // EDIT USER - OPEN
  // -----------------------------------

  const handleEditUser = (user) => {
    setIsEditing(true);
    setEditUserId(user.id);

    setUserDialog({
      open: true,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      user_type: user.user_type,
      faculty: user.faculty || '',
      study_program: user.study_program || '',
      student_id: user.student_id || '',
      phone: user.phone || '',
      address: user.address || '',
      dormitory_id: user.dormitory_id || '',
      is_active: user.is_active
    });
  };

  // -----------------------------------
  // UPDATE USER
  // -----------------------------------

  const handleUpdateUser = async () => {
    try {
      const isStudent = userDialog.user_type === 'STUDENT';

      await axios.put(`/api/users/${editUserId}`, {
        first_name: userDialog.first_name,
        last_name: userDialog.last_name,
        email: userDialog.email,
        user_type: userDialog.user_type,
        faculty: userDialog.faculty || null,
        study_program: userDialog.study_program || null,
        student_id: userDialog.student_id || null,
        phone: userDialog.phone || null,
        address: isStudent ? null : userDialog.address || null,
        dormitory_id: userDialog.dormitory_id || null,
        is_active: userDialog.is_active
      });

      setMessage({ text: "Vartotojas atnaujintas", severity: "success" });

      handleCloseDialog();
      await fetchUsers();
      await fetchDormitories();

    } catch (err) {
      setMessage({
        text: err.response?.data?.message || "Klaida atnaujinant",
        severity: "error"
      });
    }
  };

  // -----------------------------------
  // TYPE LABEL
  // -----------------------------------

  const getUserTypeLabel = (type) => {
    const map = {
      STUDENT: "Studentas",
      SUPERVISOR: "Budėtojas",
      DORMITORY_ADMIN: "Bendr. Admin",
      UNIVERSITY_ADMIN: "Univ. Admin"
    };
    return map[type] || type;
  };

  // -----------------------------------
  // FILTERED USERS LIST
  // -----------------------------------

  const filteredUsers = users
      .filter((u) => {
        const term = search.toLowerCase();
        return (
            u.first_name.toLowerCase().includes(term) ||
            u.last_name.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term) ||
            (u.phone || '').toLowerCase().includes(term)
        );
      })
      .filter((u) => {
        if (filterType === "ALL") return true;
        return u.user_type === filterType;
      })
      .filter((u) => {
        if (filterActive === "ALL") return true;
        if (filterActive === "ACTIVE") return u.is_active === true;
        if (filterActive === "INACTIVE") return u.is_active === false;
      });

  // -----------------------------------
  // GET DORM NAME FOR TABLE
  // -----------------------------------

  const getDormName = (userId) => {
    const dorm = dormitories.find(
        d => d.admin_id === userId || d.supervisor_id === userId
    );
    return dorm ? dorm.name : "-";
  };

  // -----------------------------------
  // RENDER
  // -----------------------------------

  return (
      <Container maxWidth="xl" sx={{ py: 4 }}>

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h4">Vartotojų valdymas</Typography>

          <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
          >
            Sukurti paskyrą
          </Button>
        </Box>

        {message.text && (
            <Alert
                severity={message.severity}
                sx={{ mb: 3 }}
                onClose={() => setMessage({ text: '', severity: 'info' })}
            >
              {message.text}
            </Alert>
        )}

        {/* FILTER BAR */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <TextField
              label="Paieška"
              placeholder="Vardas, pavardė, el. paštas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 300 }}
          />

          <TextField
              select
              label="Tipas"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              sx={{ width: 200 }}
          >
            <MenuItem value="ALL">Visi</MenuItem>
            <MenuItem value="STUDENT">Studentas</MenuItem>
            <MenuItem value="SUPERVISOR">Budėtojas</MenuItem>
            <MenuItem value="DORMITORY_ADMIN">Bendrabučio adminas</MenuItem>
            <MenuItem value="UNIVERSITY_ADMIN">Universiteto adminas</MenuItem>
          </TextField>

          <TextField
              select
              label="Statusas"
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              sx={{ width: 200 }}
          >
            <MenuItem value="ALL">Visi</MenuItem>
            <MenuItem value="ACTIVE">Aktyvūs</MenuItem>
            <MenuItem value="INACTIVE">Neaktyvūs</MenuItem>
          </TextField>
        </Box>

        {/* TABLE */}
        {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
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
                    <TableCell>Bendrabutis</TableCell>
                    <TableCell>Fakultetas</TableCell>
                    <TableCell>Studijų programa</TableCell>
                    <TableCell>Studento ID</TableCell>
                    <TableCell>Telefonas</TableCell>
                    <TableCell>Aktyvus</TableCell>
                    <TableCell>Veiksmai</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.first_name}</TableCell>
                        <TableCell>{u.last_name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{getUserTypeLabel(u.user_type)}</TableCell>

                        {/* NEW: Dormitory */}
                        <TableCell>
                          {(u.user_type === "DORMITORY_ADMIN" ||
                              u.user_type === "SUPERVISOR")
                              ? getDormName(u.id)
                              : "-"}
                        </TableCell>

                        <TableCell>{u.faculty || "-"}</TableCell>
                        <TableCell>{u.study_program || "-"}</TableCell>
                        <TableCell>{u.student_id || "-"}</TableCell>
                        <TableCell>{u.phone || "-"}</TableCell>
                        <TableCell>{u.is_active ? "✓" : "✗"}</TableCell>

                        <TableCell>
                          <IconButton color="primary" onClick={() => handleEditUser(u)}>
                            <EditIcon />
                          </IconButton>

                          <IconButton color="error" onClick={() => handleDeleteUser(u.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>

                      </TableRow>
                  ))}
                </TableBody>

              </Table>
            </TableContainer>
        )}

        {/* CREATE / EDIT DIALOG */}
        <Dialog open={userDialog.open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {tempPassword
                ? "Paskyra sukurta!"
                : isEditing
                    ? "Redaguoti vartotoją"
                    : "Sukurti paskyrą"}
          </DialogTitle>

          <DialogContent sx={{ mt: 2 }}>

            {/* SHOW TEMP PASSWORD AFTER CREATION */}
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
                      InputProps={{ readOnly: true }}
                      sx={{
                        mb: 2,
                        "& .MuiInputBase-input": {
                          fontSize: "1.3rem",
                          fontFamily: "monospace",
                          fontWeight: "bold",
                          textAlign: "center",
                        },
                      }}
                  />

                  <Alert severity="warning">
                    Išsaugokite šį slaptažodį – jis bus rodomas tik vieną kartą.
                    Vartotojas privalės pakeisti slaptažodį prisijungęs.
                  </Alert>
                </Box>
            ) : (
                /* --- ORIGINAL CREATE/EDIT FORM BELOW --- */
                <Grid container spacing={2}>

                  <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth required
                        label="Vardas"
                        value={userDialog.first_name}
                        onChange={(e) => setUserDialog({ ...userDialog, first_name: e.target.value })}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth required
                        label="Pavardė"
                        value={userDialog.last_name}
                        onChange={(e) => setUserDialog({ ...userDialog, last_name: e.target.value })}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                        fullWidth required
                        label="El. paštas"
                        type="email"
                        value={userDialog.email}
                        onChange={(e) => setUserDialog({ ...userDialog, email: e.target.value })}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                        select fullWidth
                        label="Tipas"
                        value={userDialog.user_type}
                        onChange={(e) => setUserDialog({ ...userDialog, user_type: e.target.value })}
                    >
                      <MenuItem value="STUDENT">Studentas</MenuItem>
                      <MenuItem value="SUPERVISOR">Budėtojas</MenuItem>
                      <MenuItem value="DORMITORY_ADMIN">Bendrabučio administratorius</MenuItem>
                      <MenuItem value="UNIVERSITY_ADMIN">Universiteto administratorius</MenuItem>
                    </TextField>
                  </Grid>

                  {/* DORMITORY SELECT */}
                  {(userDialog.user_type === "SUPERVISOR" ||
                      userDialog.user_type === "DORMITORY_ADMIN") && (
                      <Grid item xs={12}>
                        <TextField
                            select
                            fullWidth
                            required
                            label="Bendrabutis"
                            sx={{ minWidth: 230 }}
                            value={userDialog.dormitory_id}
                            onChange={(e) =>
                                setUserDialog({ ...userDialog, dormitory_id: e.target.value })
                            }
                        >
                          {dormitories.map((d) => (
                              <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                  )}

                  {userDialog.user_type === "STUDENT" && (
                      <>
                        <Grid item xs={12} md={4}>
                          <TextField
                              fullWidth required
                              label="Fakultetas"
                              value={userDialog.faculty}
                              onChange={(e) => setUserDialog({ ...userDialog, faculty: e.target.value })}
                          />
                        </Grid>

                        <Grid item xs={12} md={4}>
                          <TextField
                              fullWidth required
                              label="Studijų programa"
                              value={userDialog.study_program}
                              onChange={(e) => setUserDialog({ ...userDialog, study_program: e.target.value })}
                          />
                        </Grid>

                        <Grid item xs={12} md={4}>
                          <TextField
                              fullWidth required
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

                  {userDialog.user_type !== "STUDENT" && (
                      <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Adresas"
                            value={userDialog.address}
                            onChange={(e) => setUserDialog({ ...userDialog, address: e.target.value })}
                        />
                      </Grid>
                  )}

                  {isEditing && (
                      <Grid item xs={12}>
                        <FormControlLabel
                            control={
                              <Checkbox
                                  checked={userDialog.is_active}
                                  onChange={(e) =>
                                      setUserDialog({ ...userDialog, is_active: e.target.checked })
                                  }
                              />
                            }
                            label="Aktyvus"
                        />
                      </Grid>
                  )}
                </Grid>
            )}
          </DialogContent>

          <DialogActions>

            {/* PASSWORD VIEW MODE */}
            {tempPassword ? (
                <Button
                    onClick={() => {
                      setTempPassword('');
                      handleCloseDialog();
                    }}
                    variant="contained"
                >
                  Uždaryti
                </Button>
            ) : (
                <>
                  <Button onClick={handleCloseDialog}>Atšaukti</Button>

                  {!isEditing ? (
                      <Button
                          onClick={handleCreateUser}
                          variant="contained"
                          disabled={
                              !userDialog.first_name ||
                              !userDialog.last_name ||
                              !userDialog.email ||
                              (userDialog.user_type === "STUDENT" && (
                                  !userDialog.faculty ||
                                  !userDialog.study_program ||
                                  !userDialog.student_id
                              ))
                          }
                      >
                        Sukurti
                      </Button>
                  ) : (
                      <Button
                          onClick={handleUpdateUser}
                          variant="contained"
                          disabled={
                              !userDialog.first_name ||
                              !userDialog.last_name ||
                              !userDialog.email ||
                              (userDialog.user_type === "STUDENT" && (
                                  !userDialog.faculty ||
                                  !userDialog.study_program ||
                                  !userDialog.student_id
                              ))
                          }
                      >
                        Atnaujinti
                      </Button>
                  )}
                </>
            )}

          </DialogActions>
        </Dialog>


      </Container>
  );
}

export default AdminDashboard;
