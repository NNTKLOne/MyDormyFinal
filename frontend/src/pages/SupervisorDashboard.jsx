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
  Chip,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function SupervisorDashboard() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', severity: 'info' });
  const [reviewDialog, setReviewDialog] = useState({
    open: false,
    inspectionId: null,
    action: '',
    notes: ''
  });

  const { user } = useAuth();

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

  const handleOpenReviewDialog = (inspectionId, action) => {
    setReviewDialog({
      open: true,
      inspectionId,
      action,
      notes: ''
    });
  };

  const handleCloseReviewDialog = () => {
    setReviewDialog({
      open: false,
      inspectionId: null,
      action: '',
      notes: ''
    });
  };

  const handleReviewInspection = async () => {
    try {
      await axios.put(`/api/inspections/${reviewDialog.inspectionId}/status`, {
        status: reviewDialog.action,
        notes: reviewDialog.notes
      });

      setMessage({
        text: `Apžiūra ${reviewDialog.action === 'APPROVED' ? 'patvirtinta' : 'atmesta'}`,
        severity: 'success'
      });

      handleCloseReviewDialog();
      fetchInspections();
    } catch (error) {
      setMessage({ text: 'Klaida apdorojant apžiūrą', severity: 'error' });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('lt-LT');
  };

  const formatTime = (timeString) => {
    return timeString.substring(0, 5); // HH:MM
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Budėtojo skydelis - Apžiūros
      </Typography>

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
                <TableCell>Data</TableCell>
                <TableCell>Laikas</TableCell>
                <TableCell>Kambarys</TableCell>
                <TableCell>Bendrabutis</TableCell>
                <TableCell>Studentas</TableCell>
                <TableCell>El. paštas</TableCell>
                <TableCell>Būsena</TableCell>
                <TableCell>Veiksmai</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inspections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Apžiūrų nėra
                  </TableCell>
                </TableRow>
              ) : (
                inspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell>{formatDate(inspection.inspection_date)}</TableCell>
                    <TableCell>{formatTime(inspection.inspection_time)}</TableCell>
                    <TableCell>{inspection.room_number}</TableCell>
                    <TableCell>{inspection.dormitory_name}</TableCell>
                    <TableCell>{inspection.first_name} {inspection.last_name}</TableCell>
                    <TableCell>{inspection.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={inspection.status === 'PENDING' ? 'Laukia' : inspection.status}
                        color={inspection.status === 'PENDING' ? 'warning' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {inspection.status === 'PENDING' && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleOpenReviewDialog(inspection.id, 'APPROVED')}
                          >
                            Patvirtinti
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={() => handleOpenReviewDialog(inspection.id, 'REJECTED')}
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

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onClose={handleCloseReviewDialog} maxWidth="sm" fullWidth>
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
          <Button onClick={handleCloseReviewDialog}>Atšaukti</Button>
          <Button
            onClick={handleReviewInspection}
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
