import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Container, Paper, Alert } from '@mui/material';

function ChangePasswordPage() {
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    if (!user) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await axios.put('/api/auth/change-password', { newPassword });

            setSuccess('Slaptažodis pakeistas. Prašome prisijungti iš naujo.');
            logout();

            setTimeout(() => {
                navigate('/login');
            }, 1500);

        } catch (err) {
            setError('Nepavyko pakeisti slaptažodžio.');
        }
    };

    return (
        <Container maxWidth="sm">
            <Paper sx={{ mt: 8, p: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Jūs privalote pakeisti slaptažodį
                </Typography>

                {error && <Alert severity="error">{error}</Alert>}
                {success && <Alert severity="success">{success}</Alert>}

                <Box mt={2} component="form" onSubmit={handleSubmit}>
                    <TextField
                        label="Naujas slaptažodis"
                        type="password"
                        required
                        fullWidth
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <Button variant="contained" type="submit" fullWidth>
                        Keisti slaptažodį
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}

export default ChangePasswordPage;
