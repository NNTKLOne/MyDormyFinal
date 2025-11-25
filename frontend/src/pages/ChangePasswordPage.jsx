import { useState } from "react";
import { Container, TextField, Button, Typography, Box, Alert } from "@mui/material";
import axios from "axios";

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [message, setMessage] = useState("");

    const submit = async () => {
        try {
            const res = await axios.put(
                "/api/auth/change-password",
                { currentPassword, newPassword }
            );

            setMessage(res.data.message);

            setTimeout(() => {
                window.location.href = "/"; // Redirect after successful change
            }, 1000);

        } catch (err) {
            setMessage(err.response?.data?.message || "Klaida");
        }
    };

    return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Typography variant="h5" mb={2}>Pakeiskite slaptažodį</Typography>

            {message && <Alert sx={{ mb: 2 }}>{message}</Alert>}

            <TextField
                fullWidth
                type="password"
                label="Dabartinis slaptažodis"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                sx={{ mb: 2 }}
            />

            <TextField
                fullWidth
                type="password"
                label="Naujas slaptažodis"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                sx={{ mb: 2 }}
            />

            <Button variant="contained" fullWidth onClick={submit}>
                Pakeisti
            </Button>
        </Container>
    );
}
