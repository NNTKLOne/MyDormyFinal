import { useState, useEffect } from "react";
import {
    Table, TableRow, TableCell, TableBody, TableHead, Button,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Alert, Box, CircularProgress
} from "@mui/material";
import axios from "../api/axios.jsx";

function UniversityAdminContracts() {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

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

    if (loading)
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <CircularProgress />
            </Box>
        );

    return (
        <>
            {message && (
                <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
                    {message.text}
                </Alert>
            )}

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
                                <small>{c.email}</small>
                            </TableCell>

                            <TableCell>{c.room_number}</TableCell>
                            <TableCell>{c.dormitory_name}</TableCell>

                            <TableCell>{new Date(c.start_date).toLocaleDateString("lt-LT")}</TableCell>
                            <TableCell>{new Date(c.end_date).toLocaleDateString("lt-LT")}</TableCell>

                            <TableCell>{c.status}</TableCell>

                            <TableCell sx={{ display: "flex", gap: 1 }}>
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
                                    disabled={c.status === "TERMINATED"}
                                >
                                    Pratęsti
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Extend Dialog */}
            <Dialog open={extendDialog.open} onClose={() => setExtendDialog({ open: false })}>
                <DialogTitle>Pratęsti sutartį</DialogTitle>

                <DialogContent>
                    <TextField
                        type="date"
                        fullWidth
                        value={extendDialog.newDate}
                        onChange={(e) => setExtendDialog({ ...extendDialog, newDate: e.target.value })}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setExtendDialog({ open: false })}>Atšaukti</Button>
                    <Button variant="contained" onClick={extend}>Išsaugoti</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default UniversityAdminContracts;
