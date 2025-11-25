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
  Chip
} from '@mui/material';
import axios from 'axios';

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
                <TableCell>Veiksmai</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inspections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Laukiančių užklausų nėra
                  </TableCell>
                </TableRow>
              ) : (
                inspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell>{new Date(inspection.inspection_date).toLocaleDateString('lt-LT')}</TableCell>
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
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Review Dialog */}
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
