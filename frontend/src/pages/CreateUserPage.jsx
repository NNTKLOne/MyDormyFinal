import { useState, useEffect } from "react";
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    TextField,
    MenuItem,
    Button,
    AppBar,
    Toolbar,
    Box,
    Snackbar,
    Alert,
    CircularProgress
} from "@mui/material";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function CreateUserPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Jei ne administratorius — išmetam
    if (user && user.user_type !== "UNIVERSITY_ADMIN") {
        navigate("/");
    }

    const [dormitories, setDormitories] = useState([]);
    const [loadingDorms, setLoadingDorms] = useState(true);

    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        user_type: "",
        dormitory_ids: []
    });

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success"
    });

    useEffect(() => {
        fetchDormitories();
    }, []);

    const fetchDormitories = async () => {
        try {
            const res = await axios.get("/api/rooms/dormitories");
            setDormitories(res.data.data);
        } catch (err) {
            console.error("Klaida gaunant bendrabučius", err);
        } finally {
            setLoadingDorms(false);
        }
    };

    const handleChange = (field, value) => {
        setForm({ ...form, [field]: value });
    };

    const handleSubmit = async () => {
        if (!form.first_name || !form.last_name || !form.email || !form.user_type) {
            return setSnackbar({
                open: true,
                message: "Užpildykite visus privalomus laukus",
                severity: "warning"
            });
        }

        try {
            const payload = {
                first_name: form.first_name,
                last_name: form.last_name,
                email: form.email,
                user_type: form.user_type,
                dormitory_ids: form.user_type !== "STUDENT" ? form.dormitory_ids : []
            };

            await axios.post("/api/admin/users", payload);

            setSnackbar({
                open: true,
                message: "Paskyra sėkmingai sukurta!",
                severity: "success"
            });

            // išvalom formą
            setForm({
                first_name: "",
                last_name: "",
                email: "",
                user_type: "",
                dormitory_ids: []
            });

        } catch (err) {
            console.error("Create user error:", err);

            setSnackbar({
                open: true,
                message: err.response?.data?.message || "Nepavyko sukurti paskyros",
                severity: "error"
            });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        MyDormy – Naujos paskyros kūrimas
                    </Typography>

                    {user && (
                        <>
                            <Typography sx={{ mr: 2 }}>
                                {user.first_name} {user.last_name}
                            </Typography>
                            <Button color="inherit" onClick={handleLogout}>
                                Atsijungti
                            </Button>
                        </>
                    )}
                </Toolbar>
            </AppBar>

            <Container sx={{ mt: 4, mb: 4 }}>
                <Grid container justifyContent="center">
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h5" sx={{ mb: 3 }}>
                                    Sukurti naują vartotoją
                                </Typography>

                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Vardas"
                                            value={form.first_name}
                                            onChange={(e) => handleChange("first_name", e.target.value)}
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Pavardė"
                                            value={form.last_name}
                                            onChange={(e) => handleChange("last_name", e.target.value)}
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="El. paštas"
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => handleChange("email", e.target.value)}
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            select
                                            fullWidth
                                            label="Vartotojo tipas"
                                            value={form.user_type}
                                            onChange={(e) => handleChange("user_type", e.target.value)}
                                        >
                                            <MenuItem value="STUDENT">Studentas</MenuItem>
                                            <MenuItem value="DORMITORY_ADMIN">Bendrabučio administratorius</MenuItem>
                                            <MenuItem value="SUPERVISOR">Budėtojas</MenuItem>
                                        </TextField>
                                    </Grid>

                                    {form.user_type !== "STUDENT" && (
                                        <Grid item xs={12}>
                                            {loadingDorms ? (
                                                <CircularProgress />
                                            ) : (
                                                <TextField
                                                    select
                                                    fullWidth
                                                    SelectProps={{ multiple: true }}
                                                    label="Priskirti bendrabučiai"
                                                    value={form.dormitory_ids}
                                                    onChange={(e) => handleChange("dormitory_ids", e.target.value)}
                                                >
                                                    {dormitories.map((dorm) => (
                                                        <MenuItem key={dorm.id} value={dorm.id}>
                                                            {dorm.name}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            )}
                                        </Grid>
                                    )}

                                    <Grid item xs={12}>
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            onClick={handleSubmit}
                                        >
                                            Sukurti paskyrą
                                        </Button>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Container>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}

export default CreateUserPage;
