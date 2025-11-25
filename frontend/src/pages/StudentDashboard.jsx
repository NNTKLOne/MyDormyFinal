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

  useEffect(() => {
    fetchData();
  }, [tabValue]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tabValue === 0) {
        // Fetch inspections
        const res = await axios.get('/api/inspections/my');
        setInspections(res.data.data);
      } else if (tabValue === 1) {
        // Fetch my room (if I'm a resident)
        const res = await axios.get('/api/contracts/my-room');
        if (res.data.data) {
          setMyRoom(res.data.data);
        }
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

  const handleCancelInspection = async (id) => {
    if (!confirm('Ar tikrai norite atšaukti apžiūros užklausą?')) return;

    try {
      await axios.put(`/api/inspections/${id}/status`, {
        status: 'CANCELED'
      });
      setMessage({ text: 'Užklausa atšaukta', severity: 'success' });
      fetchData();
    } catch (error) {
      setMessage({ text: 'Klaida atšaukiant užklausą', severity: 'error' });
    }
  };

  const getStatusChip = (status) => {
    const map = {
      'PENDING': { label: 'Laukia patvirtinimo', color: 'warning' },
      'APPROVED': { label: 'Patvirtinta', color: 'success' },
      'REJECTED': { label: 'Atmesta', color: 'error' },
      'CANCELED': { label: 'Atšaukta', color: 'default' }
    };
    const { label, color } = map[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  const getContractStatusChip = (status) => {
    const map = {
      'DRAFT': { label: 'Juodraštis', color: 'default' },
      'SIGNED': { label: 'Pasirašyta', color: 'info' },
      'ACTIVE': { label: 'Aktyvi', color: 'success' },
      'EXPIRED': { label: 'Pasibaigusi', color: 'default' },
      'TERMINATED': { label: 'Nutraukta', color: 'error' }
    };
    const { label, color } = map[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
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
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
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
          {/* Apžiūros Tab */}
          {tabValue === 0 && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Čia matote visas savo suplanuotas apžiūras apsilankyti peržiūrėti kambarių.
              </Typography>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Kambarys</TableCell>
                      <TableCell>Bendrabutis</TableCell>
                      <TableCell>Vietų</TableCell>
                      <TableCell>Laisvų</TableCell>
                      <TableCell>Kaina</TableCell>
                      <TableCell>Apžiūros data</TableCell>
                      <TableCell>Laikas</TableCell>
                      <TableCell>Būsena</TableCell>
                      <TableCell>Pastabos</TableCell>
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
                      inspections.map((inspection) => (
                        <TableRow key={inspection.id}>
                          <TableCell>{inspection.room_number}</TableCell>
                          <TableCell>{inspection.dormitory_name}</TableCell>
                          <TableCell>{inspection.capacity}</TableCell>
                          <TableCell>
                            {inspection.capacity - (inspection.occupied_beds || 0)}
                          </TableCell>
                          <TableCell>€{inspection.price}/mėn</TableCell>
                          <TableCell>{new Date(inspection.inspection_date).toLocaleDateString('lt-LT')}</TableCell>
                          <TableCell>{inspection.inspection_time.substring(0, 5)}</TableCell>
                          <TableCell>{getStatusChip(inspection.status)}</TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {inspection.notes || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {inspection.status === 'PENDING' && (
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleCancelInspection(inspection.id)}
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
            </>
          )}

          {/* Mano kambarys Tab */}
          {tabValue === 1 && (
            <>
              {myRoom ? (
                <Card>
                  <CardContent>
                    <Typography variant="h5" gutterBottom>
                      Kambarys {myRoom.room_number}
                    </Typography>
                    
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body1">
                          <strong>Bendrabutis:</strong> {myRoom.dormitory_name}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          <strong>Adresas:</strong> {myRoom.dormitory_address}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          <strong>Aukštas:</strong> {myRoom.floor || 'N/A'}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          <strong>Vietų kambaryje:</strong> {myRoom.capacity}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          <strong>Užimta vietų:</strong> {myRoom.occupied_beds || 0}/{myRoom.capacity}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Typography variant="body1">
                          <strong>Kaina:</strong> €{myRoom.monthly_price}/mėn
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          <strong>Sutartis:</strong> {myRoom.contract_number}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          <strong>Sutarties būsena:</strong> {getContractStatusChip(myRoom.contract_status)}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          <strong>Sutarties pradžia:</strong> {new Date(myRoom.start_date).toLocaleDateString('lt-LT')}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          <strong>Sutarties pabaiga:</strong> {new Date(myRoom.end_date).toLocaleDateString('lt-LT')}
                        </Typography>
                      </Grid>

                      {myRoom.description && (
                        <Grid item xs={12}>
                          <Typography variant="body1" sx={{ mt: 2 }}>
                            <strong>Aprašymas:</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {myRoom.description}
                          </Typography>
                        </Grid>
                      )}

                      {myRoom.amenities && myRoom.amenities.length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="body1" sx={{ mt: 2, mb: 1 }}>
                            <strong>Patogumai:</strong>
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {myRoom.amenities.map((amenity, index) => (
                              <Chip key={index} label={amenity} />
                            ))}
                          </Box>
                        </Grid>
                      )}

                      {myRoom.roommates && myRoom.roommates.length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="body1" sx={{ mt: 2, mb: 1 }}>
                            <strong>Kambariokai:</strong>
                          </Typography>
                          {myRoom.roommates.map((roommate, index) => (
                            <Typography key={index} variant="body2" color="text.secondary">
                              • {roommate.first_name} {roommate.last_name} ({roommate.email})
                            </Typography>
                          ))}
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              ) : (
                <Alert severity="info">
                  Jūs dar negyvena bendrabutyje. Užsiregistruokite apžiūrai ir pateikite prašymą apgyvendinimui.
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
