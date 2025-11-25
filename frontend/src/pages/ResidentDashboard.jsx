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
  Alert,
  Chip,
  ButtonGroup
} from '@mui/material';
import { Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import axios from 'axios';

function ResidentDashboard() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', severity: 'info' });

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/inspections/my-visits');
      setVisits(res.data.data);
    } catch (error) {
      console.error('Error fetching visits:', error);
      setMessage({ text: 'Klaida įkeliant duomenis', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetAttendance = async (inspectionId, willAttend) => {
    try {
      await axios.put(`/api/inspections/${inspectionId}/attendance`, {
        will_attend: willAttend
      });

      setMessage({ 
        text: `Jūsų buvimo būsena nustatyta: ${willAttend ? 'Būsiu' : 'Nebūsiu'}`, 
        severity: 'success' 
      });

      fetchVisits();
    } catch (error) {
      setMessage({ text: 'Klaida nustatant būseną', severity: 'error' });
    }
  };

  const getStatusChip = (status) => {
    const map = {
      'PENDING': { label: 'Laukia patvirtinimo', color: 'warning' },
      'APPROVED': { label: 'Patvirtinta', color: 'success' }
    };
    const { label, color } = map[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  const getAttendanceChip = (willAttend) => {
    if (willAttend === null) {
      return <Chip label="Nenustatyta" color="default" size="small" />;
    }
    return willAttend 
      ? <Chip label="Būsiu" color="success" size="small" icon={<CheckIcon />} />
      : <Chip label="Nebūsiu" color="error" size="small" icon={<CloseIcon />} />;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Būsimi apsilankymai į mano kambarį
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Čia matote visus suplanuotus apsilankymus į jūsų kambarį. Prašome nurodyti ar būsite kambaryje apsilankymo metu.
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
                <TableCell>Lankytojas</TableCell>
                <TableCell>Kontaktai</TableCell>
                <TableCell>Būsena</TableCell>
                <TableCell>Mano buvimas</TableCell>
                <TableCell>Veiksmai</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Būsimų apsilankymų nėra
                  </TableCell>
                </TableRow>
              ) : (
                visits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell>{new Date(visit.inspection_date).toLocaleDateString('lt-LT')}</TableCell>
                    <TableCell>{visit.inspection_time.substring(0, 5)}</TableCell>
                    <TableCell>{visit.room_number}</TableCell>
                    <TableCell>
                      {visit.student_first_name} {visit.student_last_name}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block">
                        {visit.student_email}
                      </Typography>
                    </TableCell>
                    <TableCell>{getStatusChip(visit.status)}</TableCell>
                    <TableCell>{getAttendanceChip(visit.resident_will_attend)}</TableCell>
                    <TableCell>
                      <ButtonGroup size="small">
                        <Button
                          color="success"
                          variant={visit.resident_will_attend === true ? 'contained' : 'outlined'}
                          onClick={() => handleSetAttendance(visit.id, true)}
                          startIcon={<CheckIcon />}
                        >
                          Būsiu
                        </Button>
                        <Button
                          color="error"
                          variant={visit.resident_will_attend === false ? 'contained' : 'outlined'}
                          onClick={() => handleSetAttendance(visit.id, false)}
                          startIcon={<CloseIcon />}
                        >
                          Nebūsiu
                        </Button>
                      </ButtonGroup>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}

export default ResidentDashboard;
