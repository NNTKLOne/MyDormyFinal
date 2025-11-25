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
  Alert
} from '@mui/material';
import axios from 'axios';

const getStatusChip = (status) => {
  const map = {
    DRAFT: { label: 'Laukiama pasirašymo', color: 'default' },
    SIGNED: { label: 'Laukiama admino patvirtinimo', color: 'info' },
    ACTIVE: { label: 'Aktyvi', color: 'success' },
    EXPIRED: { label: 'Pasibaigusi', color: 'default' },
    TERMINATED: { label: 'Nutraukta', color: 'error' }
  };
  const { label, color } = map[status] || { label: status, color: 'default' };
  return <Chip label={label} color={color} size="small" />;
};

function DormAdminContracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', severity: 'info' });

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/contracts/admin');
      setContracts(res.data.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setMessage({
        text: error.response?.data?.message || 'Klaida įkeliant sutartis',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleAction = async (id, action) => {
    if (
      !confirm(
        action === 'APPROVE'
          ? 'Ar tikrai norite patvirtinti šią sutartį?'
          : 'Ar tikrai norite atmesti šią sutartį?'
      )
    ) {
      return;
    }

    try {
      await axios.put(`/api/contracts/${id}/admin-status`, { action });
      setMessage({
        text: action === 'APPROVE' ? 'Sutartis patvirtinta' : 'Sutartis atmesta',
        severity: 'success'
      });
      fetchContracts();
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Klaida atnaujinant sutartį',
        severity: 'error'
      });
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Sutarčių valdymas
      </Typography>

      {message.text && (
        <Alert
          severity={message.severity}
          sx={{ mb: 2 }}
          onClose={() => setMessage({ text: '', severity: 'info' })}
        >
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
                <TableCell>Sutartis</TableCell>
                <TableCell>Studentas</TableCell>
                <TableCell>Kambarys</TableCell>
                <TableCell>Bendrabutis</TableCell>
                <TableCell>Laikotarpis</TableCell>
                <TableCell>Būsena</TableCell>
                <TableCell>Veiksmai</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.contract_number}</TableCell>
                  <TableCell>
                    {c.first_name} {c.last_name}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {c.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    Kambarys {c.room_number}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      Vietų: {c.capacity}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {c.dormitory_name}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {c.dormitory_address}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(c.start_date).toLocaleDateString('lt-LT')} –{' '}
                    {new Date(c.end_date).toLocaleDateString('lt-LT')}
                  </TableCell>
                  <TableCell>{getStatusChip(c.status)}</TableCell>
                  <TableCell>
                    {c.status === 'SIGNED' && (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          sx={{ mr: 1, mb: 1 }}
                          onClick={() => handleAction(c.id, 'APPROVE')}
                        >
                          Patvirtinti
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          sx={{ mb: 1 }}
                          onClick={() => handleAction(c.id, 'REJECT')}
                        >
                          Atmesti
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {contracts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nėra sutarčių.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}

export default DormAdminContracts;
