import { useState, useEffect, useMemo } from 'react';
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
  Alert,
  TextField,
  MenuItem
} from '@mui/material';
import axios from '../api/axios';

const getStatusChip = (status) => {
  const map = {
    DRAFT: { label: 'Laukiama pasirašymo', color: 'default' },
    SIGNED: { label: 'Laukiama admino patvirtinimo', color: 'info' },
    ACTIVE: { label: 'Aktyvi', color: 'success' },
    REJECTED: { label: 'Atmesta', color: 'error' },
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

  // 🔥 Filtrų state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [startFrom, setStartFrom] = useState('');
  const [startTo, setStartTo] = useState('');
  const [endFrom, setEndFrom] = useState('');
  const [endTo, setEndTo] = useState('');

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/contracts/admin');
      setContracts(res.data.data);
    } catch (error) {
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
    if (!confirm(action === 'APPROVE'
        ? 'Ar tikrai norite patvirtinti šią sutartį?'
        : 'Ar tikrai norite atmesti šią sutartį?')) return;

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

  // 🔥 MEMO FILTRAVIMAS
  const filteredContracts = useMemo(() => {
    return contracts
        .filter(c => {
          const term = search.toLowerCase();
          return (
              c.contract_number.toLowerCase().includes(term) ||
              `${c.first_name} ${c.last_name}`.toLowerCase().includes(term) ||
              c.room_number.toString().includes(term) ||
              c.email.toLowerCase().includes(term)
          );
        })
        .filter(c =>
            filterStatus === 'ALL' ? true : c.status === filterStatus
        )
        .filter(c =>
            startFrom ? new Date(c.start_date) >= new Date(startFrom) : true
        )
        .filter(c =>
            startTo ? new Date(c.start_date) <= new Date(startTo) : true
        )
        .filter(c =>
            endFrom ? new Date(c.end_date) >= new Date(endFrom) : true
        )
        .filter(c =>
            endTo ? new Date(c.end_date) <= new Date(endTo) : true
        );
  }, [contracts, search, filterStatus, startFrom, startTo, endFrom, endTo]);

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

        {/* 🔥 Filtrų juosta */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
              label="Paieška"
              placeholder="Sutartis, studentas, kambarys..."
              sx={{ width: 280 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
          />

          <TextField
              select
              label="Statusas"
              sx={{ width: 200 }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="ALL">Visi</MenuItem>
            <MenuItem value="DRAFT">Laukiama pasirašymo</MenuItem>
            <MenuItem value="SIGNED">Pasirašyta</MenuItem>
            <MenuItem value="ACTIVE">Aktyvi</MenuItem>
            <MenuItem value="REJECTED">Atmesta</MenuItem>
            <MenuItem value="EXPIRED">Pasibaigusi</MenuItem>
            <MenuItem value="TERMINATED">Nutraukta</MenuItem>
          </TextField>

          <TextField
              type="date"
              label="Pradžia nuo"
              InputLabelProps={{ shrink: true }}
              value={startFrom}
              onChange={(e) => setStartFrom(e.target.value)}
          />

          <TextField
              type="date"
              label="Pradžia iki"
              InputLabelProps={{ shrink: true }}
              value={startTo}
              onChange={(e) => setStartTo(e.target.value)}
          />

          <TextField
              type="date"
              label="Pabaiga nuo"
              InputLabelProps={{ shrink: true }}
              value={endFrom}
              onChange={(e) => setEndFrom(e.target.value)}
          />

          <TextField
              type="date"
              label="Pabaiga iki"
              InputLabelProps={{ shrink: true }}
              value={endTo}
              onChange={(e) => setEndTo(e.target.value)}
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
                  {filteredContracts.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.contract_number}</TableCell>

                        <TableCell>
                          {c.first_name} {c.last_name}
                          <br />
                          <Typography variant="caption">{c.email}</Typography>
                        </TableCell>

                        <TableCell>
                          {c.room_number}
                          <br />
                          <Typography variant="caption">
                            Vietų: {c.capacity}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          {c.dormitory_name}
                          <br />
                          <Typography variant="caption">
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
                                    sx={{ mr: 1 }}
                                    onClick={() => handleAction(c.id, 'APPROVE')}
                                >
                                  Patvirtinti
                                </Button>

                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    onClick={() => handleAction(c.id, 'REJECT')}
                                >
                                  Atmesti
                                </Button>
                              </>
                          )}
                        </TableCell>
                      </TableRow>
                  ))}

                  {filteredContracts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          Pagal pasirinktus filtrus sutarčių nėra.
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
