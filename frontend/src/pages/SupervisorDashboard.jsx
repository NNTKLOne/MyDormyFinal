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
  Alert,
  MenuItem,
  Chip
} from '@mui/material';
import axios from '../api/axios';

function SupervisorDashboard() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', severity: 'info' });

  // ➤ FILTERS
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [reviewDialog, setReviewDialog] = useState({
    open: false,
    inspectionId: null,
    action: '',
    notes: ''
  });

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/inspections/supervisor');
      setInspections(res.data.data);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      setMessage({ text: 'Klaida įkeliant apžiūras', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (inspectionId, action) => {
    setReviewDialog({
      open: true,
      inspectionId,
      action,
      notes: ''
    });
  };

  const handleCloseReview = () => {
    setReviewDialog({
      open: false,
      inspectionId: null,
      action: '',
      notes: ''
    });
  };

  const handleReview = async () => {
    try {
      await axios.put(`/api/inspections/${reviewDialog.inspectionId}/status`, {
        status: reviewDialog.action,
        notes: reviewDialog.notes
      });

      setMessage({
        text: `Apžiūra ${reviewDialog.action === 'APPROVED' ? 'patvirtinta' : 'atmesta'}`,
        severity: 'success'
      });

      handleCloseReview();
      fetchInspections();
    } catch (error) {
      setMessage({ text: 'Klaida apdorojant apžiūrą', severity: 'error' });
    }
  };

  const getStatusChip = (status) => {
    const map = {
      PENDING:   { label: 'Laukia patvirtinimo', color: 'warning' },
      APPROVED:  { label: 'Patvirtinta',         color: 'success' },
      REJECTED:  { label: 'Atmesta',             color: 'error' },
      CANCELED:  { label: 'Atšaukta',            color: 'default' },
      COMPLETED: { label: 'Įvykdyta',            color: 'info' }
    };
    const { label, color } = map[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  // --------------------------
  // FRONTEND FILTERING
  // --------------------------

  const filtered = inspections
      .filter((i) => {
        const fullName = `${i.first_name} ${i.last_name}`.toLowerCase();
        return fullName.includes(search.toLowerCase());
      })
      .filter((i) => {
        if (filterStatus === 'ALL') return true;
        return i.status === filterStatus;
      })
      .filter((i) => {
        if (!dateFrom) return true;
        return new Date(i.inspection_date) >= new Date(dateFrom);
      })
      .filter((i) => {
        if (!dateTo) return true;
        return new Date(i.inspection_date) <= new Date(dateTo);
      });

  return (
      <Container maxWidth="xl" sx={{ py: 4 }}>

        <Typography variant="h4" gutterBottom>
          Apžiūrų užklausos
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Studentų pateiktos apžiūrų užklausos. Patvirtinkite arba atmeskite kiekvieną užklausą.
        </Typography>

        {message.text && (
            <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage({ text: '', severity: 'info' })}>
              {message.text}
            </Alert>
        )}

        {/* FILTER BAR */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
              label="Paieška pagal studentą"
              placeholder="Vardas pavardė..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 250 }}
          />

          <TextField
              select
              label="Būsena"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              sx={{ width: 200 }}
          >
            <MenuItem value="ALL">Visos</MenuItem>
            <MenuItem value="PENDING">Laukia</MenuItem>
            <MenuItem value="APPROVED">Patvirtintos</MenuItem>
            <MenuItem value="REJECTED">Atmestos</MenuItem>
            <MenuItem value="CANCELED">Atšauktos</MenuItem>
            <MenuItem value="COMPLETED">Įvykdytos</MenuItem>
          </TextField>

          <TextField
              label="Data nuo"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
          />

          <TextField
              label="Data iki"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
          />
        </Box>

        {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
        ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Laikas</TableCell>
                    <TableCell>Kambarys</TableCell>
                    <TableCell>Bendrabutis</TableCell>
                    <TableCell>Vietos</TableCell>
                    <TableCell>Studentas</TableCell>
                    <TableCell>Telefonas</TableCell>
                    <TableCell>Būsena</TableCell>
                    <TableCell>Veiksmai</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          Užklausų nerasta pagal pasirinktus filtrus
                        </TableCell>
                      </TableRow>
                  ) : (
                      filtered.map((inspection) => (
                          <TableRow key={inspection.id}>
                            <TableCell>
                              {new Date(inspection.inspection_date).toLocaleDateString('lt-LT')}
                            </TableCell>
                            <TableCell>{inspection.inspection_time.substring(0, 5)}</TableCell>

                            <TableCell>
                              {inspection.room_number}
                              <Chip
                                  label={`${inspection.available_beds} laisva`}
                                  size="small"
                                  color="success"
                                  sx={{ ml: 1 }}
                              />
                            </TableCell>

                            <TableCell>{inspection.dormitory_name}</TableCell>

                            <TableCell>
                              {inspection.occupied_beds || 0}/{inspection.capacity}
                            </TableCell>

                            <TableCell>
                              {inspection.first_name} {inspection.last_name}
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                {inspection.email}
                              </Typography>
                            </TableCell>

                            <TableCell>{inspection.phone || '-'}</TableCell>

                            <TableCell>{getStatusChip(inspection.status)}</TableCell>

                            <TableCell>
                              {inspection.status === 'PENDING' ? (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        color="success"
                                        onClick={() => handleOpenReview(inspection.id, 'APPROVED')}
                                    >
                                      Patvirtinti
                                    </Button>

                                    <Button
                                        size="small"
                                        variant="contained"
                                        color="error"
                                        onClick={() => handleOpenReview(inspection.id, 'REJECTED')}
                                    >
                                      Atmesti
                                    </Button>
                                  </Box>
                              ) : (
                                  <Typography variant="caption" color="text.secondary">
                                    Veiksmų nėra
                                  </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
        )}

        {/* REVIEW DIALOG */}
        <Dialog open={reviewDialog.open} onClose={handleCloseReview} maxWidth="sm" fullWidth>
          <DialogTitle>
            {reviewDialog.action === 'APPROVED' ? 'Patvirtinti apžiūrą' : 'Atmesti apžiūrą'}
          </DialogTitle>

          <DialogContent>
            <TextField
                fullWidth
                multiline
                rows={4}
                label="Pastabos (neprivaloma)"
                value={reviewDialog.notes}
                onChange={(e) => setReviewDialog({ ...reviewDialog, notes: e.target.value })}
                sx={{ mt: 2 }}
            />
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseReview}>Atšaukti</Button>
            <Button
                onClick={handleReview}
                variant="contained"
                color={reviewDialog.action === 'APPROVED' ? 'success' : 'error'}
            >
              Patvirtinti
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
  );
}

export default SupervisorDashboard;
