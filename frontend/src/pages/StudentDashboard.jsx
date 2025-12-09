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
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import axios from 'axios';

function StudentDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [inspections, setInspections] = useState([]);
  const [myRoom, setMyRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', severity: 'info' });

  /* ============================================================
     LOAD MY ROOM — ALWAYS LOAD ONCE
  ============================================================ */
  useEffect(() => {
    loadMyRoom();
  }, []);

  const loadMyRoom = async () => {
    try {
      const res = await axios.get('/api/contracts/my-room');
      setMyRoom(res.data.data || null);
    } catch (error) {
      setMyRoom(null);
    }
  };

  /* ============================================================
     LOAD PAGE DATA BASED ON TAB
  ============================================================ */
  useEffect(() => {
    fetchData();
  }, [tabValue]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tabValue === 0) {
        const res = await axios.get('/api/inspections/my');
        setInspections(res.data.data);
      } else if (tabValue === 1) {
        await loadMyRoom(); // reload room on entering tab
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status !== 404) {
        setMessage({ text: 'Klaida įkeliant duomenis', severity: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     CANCEL INSPECTION
  ============================================================ */
  const handleCancelInspection = async (id) => {
    if (!confirm('Ar tikrai norite atšaukti apžiūros užklausą?')) return;

    try {
      await axios.put(`/api/inspections/${id}/status`, { status: 'CANCELED' });

      setMessage({ text: 'Užklausa atšaukta', severity: 'success' });

      setTimeout(() => fetchData(), 50);
      setTimeout(() => loadMyRoom(), 150);

    } catch (error) {
      setMessage({ text: 'Klaida atšaukiant užklausą', severity: 'error' });
    }
  };

  /* ============================================================
     STATUS CHIPS
  ============================================================ */
  const getStatusChip = (status) => {
    const map = {
      PENDING: { label: 'Laukia patvirtinimo', color: 'warning' },
      APPROVED: { label: 'Patvirtinta', color: 'success' },
      REJECTED: { label: 'Atmesta', color: 'error' },
      CANCELED: { label: 'Atšaukta', color: 'default' },
      COMPLETED: { label: 'Įvykdyta', color: 'info' }
    };
    const { label, color } = map[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  const getContractStatusChip = (status) => {
    const map = {
      DRAFT: { label: 'Laukiama pasirašymo', color: 'default' },
      SIGNED: { label: 'Laukiama bendrabučio administratoriaus patvirtinimo', color: 'info' },
      ACTIVE: { label: 'Aktyvi', color: 'success' },
      EXPIRED: { label: 'Pasibaigusi', color: 'default' },
      TERMINATED: { label: 'Nutraukta', color: 'error' }
    };
    const { label, color } = map[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  /* ============================================================
     SIGN CONTRACT
  ============================================================ */
  const handleSignContract = async () => {
    if (!myRoom?.contract_id) return;
    if (!confirm('Ar tikrai norite pasirašyti šią sutartį?')) return;

    try {
      await axios.put(`/api/contracts/${myRoom.contract_id}/sign`);

      setMessage({
        text: 'Sutartis pasirašyta. Laukiama bendrabučio administratoriaus patvirtinimo.',
        severity: 'success'
      });

      loadMyRoom();
      fetchData();

    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Klaida pasirašant sutartį',
        severity: 'error'
      });
    }
  };

  return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Mano informacija
        </Typography>

        {message.text && (
            <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage({ text: '', severity: 'info' })}>
              {message.text}
            </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="Mano apžiūros" />
            <Tab label="Mano kambarys" />
          </Tabs>
        </Box>

        {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
        ) : (
            <>
              {/* ============================================================
              TAB 0 — MY INSPECTIONS
          ============================================================ */}
              {tabValue === 0 && (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Kambarys</TableCell>
                          <TableCell>Bendrabutis</TableCell>
                          <TableCell>Vietų</TableCell>
                          <TableCell>Laisvų</TableCell>
                          <TableCell>Kaina</TableCell>
                          <TableCell>Data</TableCell>
                          <TableCell>Laikas</TableCell>
                          <TableCell>Būsena</TableCell>
                          <TableCell>Budėtojo komentaras</TableCell>
                          <TableCell>Veiksmai</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {inspections.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={10} align="center">
                                Apžiūrų užklausų nėra
                              </TableCell>
                            </TableRow>
                        ) : (
                            inspections.map((x) => (
                                <TableRow key={x.id}>
                                  <TableCell>{x.room_number}</TableCell>
                                  <TableCell>{x.dormitory_name}</TableCell>
                                  <TableCell>{x.capacity}</TableCell>
                                  <TableCell>{x.capacity - (x.occupied_beds || 0)}</TableCell>
                                  <TableCell>€{x.price}/mėn</TableCell>
                                  <TableCell>{new Date(x.inspection_date).toLocaleDateString('lt-LT')}</TableCell>
                                  <TableCell>{x.inspection_time.substring(0, 5)}</TableCell>
                                  <TableCell>{getStatusChip(x.status)}</TableCell>
                                  <TableCell><Typography variant="caption">{x.notes || '-'}</Typography></TableCell>

                                  <TableCell>
                                    {(x.status === 'PENDING' || x.status === 'APPROVED') &&
                                        !(myRoom && ['SIGNED', 'ACTIVE'].includes(myRoom.contract_status)) && (
                                            <Button size="small" color="error"
                                                    onClick={() => handleCancelInspection(x.id)}>
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

              {/* ============================================================
              TAB 1 — MY ROOM
          ============================================================ */}
              {tabValue === 1 && (
                  <>
                    {myRoom ? (
                        <Card><CardContent>
                          <Typography variant="h5" gutterBottom>
                            Kambarys {myRoom.room_number}
                          </Typography>

                          <Grid container spacing={2} sx={{ mt: 2 }}>
                            {/* left */}
                            <Grid item xs={12} md={6}>
                              <Typography><strong>Bendrabutis:</strong> {myRoom.dormitory_name}</Typography>
                              <Typography sx={{ mt: 1 }}><strong>Adresas:</strong> {myRoom.dormitory_address}</Typography>
                              <Typography sx={{ mt: 1 }}><strong>Aukštas:</strong> {myRoom.floor}</Typography>
                              <Typography sx={{ mt: 1 }}><strong>Vietų:</strong> {myRoom.capacity}</Typography>
                              <Typography sx={{ mt: 1 }}>
                                <strong>Užimta:</strong> {myRoom.occupied_beds}/{myRoom.capacity}
                              </Typography>
                            </Grid>

                            {/* right */}
                            <Grid item xs={12} md={6}>
                              <Typography><strong>Kaina:</strong> €{myRoom.monthly_price}/mėn</Typography>
                              <Typography sx={{ mt: 1 }}><strong>Sutartis:</strong> {myRoom.contract_number}</Typography>
                              <Typography sx={{ mt: 1 }}>
                                <strong>Sutarties būsena:</strong> {getContractStatusChip(myRoom.contract_status)}
                              </Typography>
                              <Typography sx={{ mt: 1 }}>
                                <strong>Pradžia:</strong> {new Date(myRoom.start_date).toLocaleDateString('lt-LT')}
                              </Typography>
                              <Typography sx={{ mt: 1 }}>
                                <strong>Pabaiga:</strong> {new Date(myRoom.end_date).toLocaleDateString('lt-LT')}
                              </Typography>
                            </Grid>

                            {myRoom.contract_status === 'DRAFT' && (
                                <Grid item xs={12} sx={{ mt: 4 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button variant="contained" onClick={handleSignContract}>
                                      Pasirašyti sutartį
                                    </Button>
                                  </Box>
                                </Grid>
                            )}
                          </Grid>
                        </CardContent></Card>
                    ) : (
                        <Alert severity="info">
                          Jūs dar negyvenate bendrabutyje.
                        </Alert>
                    )}
                  </>
              )}
            </>
        )}
      </Container>
  );
}

export default StudentDashboard;
