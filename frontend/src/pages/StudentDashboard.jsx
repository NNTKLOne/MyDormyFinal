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
  Alert
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function StudentDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [reservations, setReservations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', severity: 'info' });
  
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, [tabValue]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tabValue === 0) {
        const res = await axios.get('/api/reservations/my');
        setReservations(res.data.data);
      } else if (tabValue === 1) {
        const res = await axios.get('/api/requests/my');
        setRequests(res.data.data);
      } else if (tabValue === 2) {
        const res = await axios.get('/api/contracts/my');
        setContracts(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ text: 'Klaida įkeliant duomenis', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (id) => {
    if (!confirm('Ar tikrai norite atšaukti rezervaciją?')) return;

    try {
      await axios.delete(`/api/reservations/${id}`);
      setMessage({ text: 'Rezervacija sėkmingai atšaukta', severity: 'success' });
      fetchData();
    } catch (error) {
      setMessage({ text: 'Klaida atšaukiant rezervaciją', severity: 'error' });
    }
  };

  const handleSignContract = async (id) => {
    if (!confirm('Ar tikrai norite pasirašyti sutartį?')) return;

    try {
      await axios.put(`/api/contracts/${id}/sign`);
      setMessage({ text: 'Sutartis sėkmingai pasirašyta!', severity: 'success' });
      fetchData();
    } catch (error) {
      setMessage({ text: 'Klaida pasirašant sutartį', severity: 'error' });
    }
  };

  const getStatusChip = (status) => {
    const statusMap = {
      'PENDING_APPROVAL': { label: 'Laukia patvirtinimo', color: 'warning' },
      'CONFIRMED': { label: 'Patvirtinta', color: 'success' },
      'CANCELED': { label: 'Atšaukta', color: 'error' },
      'SUBMITTED': { label: 'Pateikta', color: 'info' },
      'UNDER_REVIEW': { label: 'Peržiūrima', color: 'warning' },
      'APPROVED': { label: 'Patvirtinta', color: 'success' },
      'REJECTED': { label: 'Atmesta', color: 'error' },
      'DRAFT': { label: 'Juodraštis', color: 'default' },
      'SIGNED': { label: 'Pasirašyta', color: 'success' },
      'ACTIVE': { label: 'Aktyvi', color: 'success' },
      'EXPIRED': { label: 'Pasibaigusi', color: 'default' }
    };

    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Mano informacija
      </Typography>

      {message.text && (
        <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage({ text: '', severity: 'info' })}>
          {message.text}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Mano rezervacijos" />
          <Tab label="Mano prašymai" />
          <Tab label="Mano sutartys" />
        </Tabs>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Rezervacijos */}
          {tabValue === 0 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Kambarys</TableCell>
                    <TableCell>Bendrabutis</TableCell>
                    <TableCell>Kaina</TableCell>
                    <TableCell>Pradžia</TableCell>
                    <TableCell>Pabaiga</TableCell>
                    <TableCell>Būsena</TableCell>
                    <TableCell>Veiksmai</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        Rezervacijų nėra
                      </TableCell>
                    </TableRow>
                  ) : (
                    reservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell>{reservation.room_number}</TableCell>
                        <TableCell>{reservation.dormitory_name}</TableCell>
                        <TableCell>€{reservation.price}/mėn</TableCell>
                        <TableCell>{new Date(reservation.start_date).toLocaleDateString('lt-LT')}</TableCell>
                        <TableCell>{new Date(reservation.end_date).toLocaleDateString('lt-LT')}</TableCell>
                        <TableCell>{getStatusChip(reservation.status)}</TableCell>
                        <TableCell>
                          {reservation.status === 'PENDING_APPROVAL' && (
                            <Button
                              size="small"
                              color="error"
                              onClick={() => handleCancelReservation(reservation.id)}
                            >
                              Atšaukti
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Prašymai */}
          {tabValue === 1 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Kambarys</TableCell>
                    <TableCell>Bendrabutis</TableCell>
                    <TableCell>Kaina</TableCell>
                    <TableCell>Pateikta</TableCell>
                    <TableCell>Būsena</TableCell>
                    <TableCell>Atmetimo priežastis</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        Prašymų nėra
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.room_number}</TableCell>
                        <TableCell>{request.dormitory_name}</TableCell>
                        <TableCell>€{request.price}/mėn</TableCell>
                        <TableCell>{new Date(request.submitted_at).toLocaleDateString('lt-LT')}</TableCell>
                        <TableCell>{getStatusChip(request.status)}</TableCell>
                        <TableCell>{request.rejection_reason || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Sutartys */}
          {tabValue === 2 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Sutarties Nr.</TableCell>
                    <TableCell>Kambarys</TableCell>
                    <TableCell>Bendrabutis</TableCell>
                    <TableCell>Kaina/mėn</TableCell>
                    <TableCell>Pradžia</TableCell>
                    <TableCell>Pabaiga</TableCell>
                    <TableCell>Būsena</TableCell>
                    <TableCell>Veiksmai</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        Sutarčių nėra
                      </TableCell>
                    </TableRow>
                  ) : (
                    contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell>{contract.contract_number}</TableCell>
                        <TableCell>{contract.room_number}</TableCell>
                        <TableCell>{contract.dormitory_name}</TableCell>
                        <TableCell>€{contract.monthly_price}</TableCell>
                        <TableCell>{new Date(contract.start_date).toLocaleDateString('lt-LT')}</TableCell>
                        <TableCell>{new Date(contract.end_date).toLocaleDateString('lt-LT')}</TableCell>
                        <TableCell>{getStatusChip(contract.status)}</TableCell>
                        <TableCell>
                          {contract.status === 'DRAFT' && (
                            <Button
                              variant="contained"
                              size="small"
                              color="primary"
                              onClick={() => handleSignContract(contract.id)}
                            >
                              Pasirašyti
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Container>
  );
}

export default StudentDashboard;
