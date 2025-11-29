import { useState, useEffect, useMemo } from "react";
import {
    Container,
    Typography,
    Box,
    Table, TableRow, TableCell, TableBody, TableHead,
    TableContainer, Paper,
    Button,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem,
    Alert, CircularProgress, Chip
} from "@mui/material";
import axios from "../api/axios.jsx";

function UniversityAdminContracts() {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    // ------------ FILTERS ------------
    const [search, setSearch] = useState("");
    const [filterDorm, setFilterDorm] = useState("ALL");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [startFrom, setStartFrom] = useState("");
    const [startTo, setStartTo] = useState("");
    const [endFrom, setEndFrom] = useState("");
    const [endTo, setEndTo] = useState("");

    // ------------ EXTEND DIALOG ------------
    const [extendDialog, setExtendDialog] = useState({
        open: false,
        id: null,
        newDate: ""
    });

    useEffect(() => {
        loadContracts();
    }, []);

    const loadContracts = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/uadmin/contracts");
            setContracts(res.data.data);
        } catch (err) {
            setMessage({ text: "Klaida gaunant sutartis", severity: "error" });
        }
        setLoading(false);
    };

    const terminate = async (id) => {
        if (!confirm("Ar tikrai likviduoti šią sutartį?")) return;

        try {
            await axios.put(`/api/uadmin/contracts/${id}/terminate`);
            setMessage({ text: "Sutartis likviduota", severity: "success" });
            loadContracts();
        } catch (err) {
            setMessage({ text: err.response?.data?.message || "Klaida", severity: "error" });
        }
    };

    const openExtend = (contract) => {
        const dateISO = new Date(contract.end_date).toISOString().split("T")[0];

        setExtendDialog({
            open: true,
            id: contract.id,
            newDate: dateISO
        });
    };

    const extend = async () => {
        try {
            await axios.put(`/api/uadmin/contracts/${extendDialog.id}/extend`, {
                new_end_date: extendDialog.newDate
            });

            setMessage({ text: "Sutartis sėkmingai pratęsta", severity: "success" });
            setExtendDialog({ open: false, id: null, newDate: "" });
            loadContracts();

        } catch (err) {
            setMessage({ text: err.response?.data?.message || "Klaida", severity: "error" });
        }
    };

    // ------------ STATUS CHIP ------------
    const getStatusChip = (status) => {
        const map = {
            ACTIVE: { label: "Aktyvi", color: "success" },
            EXPIRED: { label: "Pasibaigusi", color: "warning" },
            TERMINATED: { label: "Nutraukta", color: "error" }
        };

        const item = map[status] || { label: status, color: "default" };
        return <Chip size="small" color={item.color} label={item.label} />;
    };

    // ------------ FILTERING LOGIC ------------
    const filtered = useMemo(() => {
        return contracts
            .filter((c) => {
                const q = search.toLowerCase();
                return (
                    c.contract_number.toLowerCase().includes(q) ||
                    `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
                    c.room_number.toString().includes(q)
                );
            })
            .filter((c) => (filterDorm === "ALL" ? true : c.dormitory_name === filterDorm))
            .filter((c) => (filterStatus === "ALL" ? true : c.status === filterStatus))
            .filter((c) =>
                startFrom ? new Date(c.start_date) >= new Date(startFrom) : true
            )
            .filter((c) =>
                startTo ? new Date(c.start_date) <= new Date(startTo) : true
            )
            .filter((c) =>
                endFrom ? new Date(c.end_date) >= new Date(endFrom) : true
            )
            .filter((c) =>
                endTo ? new Date(c.end_date) <= new Date(endTo) : true
            );
    }, [contracts, search, filterDorm, filterStatus, startFrom, startTo, endFrom, endTo]);

    const dorms = [...new Set(contracts.map(c => c.dormitory_name))];

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>

            {/* TITLE */}
            <Typography variant="h4" sx={{ mb: 3 }}>
                Sutarčių valdymas
            </Typography>

            {/* ALERT */}
            {message && (
                <Alert severity={message.severity} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
                    {message.text}
                </Alert>
            )}

            {/* ---------------- FILTER BAR ---------------- */}
            <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
                <TextField
                    label="Paieška"
                    placeholder="Sutartis, studentas, kambarys..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ width: 260 }}
                />

                <TextField
                    select
                    label="Bendrabutis"
                    value={filterDorm}
                    onChange={(e) => setFilterDorm(e.target.value)}
                    sx={{ width: 200 }}
                >
                    <MenuItem value="ALL">Visi</MenuItem>
                    {dorms.map((d) => (
                        <MenuItem key={d} value={d}>{d}</MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Statusas"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    sx={{ width: 200 }}
                >
                    <MenuItem value="ALL">Visi</MenuItem>
                    <MenuItem value="ACTIVE">Aktyvi</MenuItem>
                    <MenuItem value="SIGNED">Pasirašyta</MenuItem>
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

            {/* ---------------- TABLE ---------------- */}
            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
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
                                <TableCell>Pradžia</TableCell>
                                <TableCell>Pabaiga</TableCell>
                                <TableCell>Statusas</TableCell>
                                <TableCell sx={{ width: 180 }}>Veiksmai</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {filtered.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell>{c.contract_number}</TableCell>

                                    <TableCell>
                                        {c.first_name} {c.last_name}
                                        <br />
                                        <small>{c.email}</small>
                                    </TableCell>

                                    <TableCell>{c.room_number}</TableCell>
                                    <TableCell>{c.dormitory_name}</TableCell>

                                    <TableCell>{new Date(c.start_date).toLocaleDateString("lt-LT")}</TableCell>
                                    <TableCell>{new Date(c.end_date).toLocaleDateString("lt-LT")}</TableCell>

                                    <TableCell>{getStatusChip(c.status)}</TableCell>

                                    {/* Veiksmai */}
                                    <TableCell>
                                        {c.status !== "TERMINATED" && c.status !== "EXPIRED" ? (
                                            <Box sx={{ display: "flex", gap: 1 }}>
                                                <Button
                                                    color="error"
                                                    size="small"
                                                    onClick={() => terminate(c.id)}
                                                >
                                                    Likviduoti
                                                </Button>

                                                <Button
                                                    color="primary"
                                                    size="small"
                                                    onClick={() => openExtend(c)}
                                                >
                                                    Pratęsti
                                                </Button>
                                            </Box>
                                        ) : null}
                                    </TableCell>

                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* ---------------- EXTEND DIALOG ---------------- */}
            <Dialog open={extendDialog.open} onClose={() => setExtendDialog({ open: false })}>
                <DialogTitle>Pratęsti sutartį</DialogTitle>

                <DialogContent sx={{ mt: 2 }}>
                    <TextField
                        type="date"
                        fullWidth
                        value={extendDialog.newDate}
                        onChange={(e) => setExtendDialog({ ...extendDialog, newDate: e.target.value })}
                    />
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setExtendDialog({ open: false })}>Atšaukti</Button>
                    <Button variant="contained" onClick={extend}>Išsaugoti</Button>
                </DialogActions>
            </Dialog>

        </Container>
    );
}

export default UniversityAdminContracts;
