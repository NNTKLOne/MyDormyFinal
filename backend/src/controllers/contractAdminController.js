import { query } from "../config/database.js";
import { recalculateRoomStatus } from "./roomController.js";
import { sendNotification } from "../services/notificationService.js";

/* ============================================================
   GET ALL CONTRACTS (ACTIVE / TERMINATED / EXPIRED)
============================================================ */
export const getAllContracts = async (req, res) => {
    try {
        const result = await query(`
            SELECT
                c.*,
                r.room_number,
                d.name AS dormitory_name,
                u.first_name,
                u.last_name,
                u.email
            FROM contracts c
            JOIN rooms r ON c.room_id = r.id
            JOIN dormitories d ON r.dormitory_id = d.id
            JOIN users u ON c.student_id = u.id
            WHERE c.status IN ('ACTIVE', 'TERMINATED', 'EXPIRED')
            ORDER BY c.created_at DESC
        `);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Get contracts error:", err);
        res.status(500).json({ success: false, message: "Serverio klaida" });
    }
};

/* ============================================================
   TERMINATE CONTRACT + SEND NOTIFICATION
============================================================ */
export const terminateContract = async (req, res) => {
    try {
        const { id } = req.params;

        const contractRes = await query(
            `SELECT 
                c.*, 
                r.room_number,
                d.name AS dormitory_name
             FROM contracts c
             JOIN rooms r ON c.room_id = r.id
             JOIN dormitories d ON r.dormitory_id = d.id
             WHERE c.id = $1`,
            [id]
        );

        if (contractRes.rows.length === 0)
            return res.status(404).json({ success: false, message: "Sutartis nerasta" });

        const contract = contractRes.rows[0];

        if (contract.status === "TERMINATED")
            return res.status(400).json({ success: false, message: "Sutartis jau nutraukta" });

        // MARK AS TERMINATED
        await query(
            `UPDATE contracts
                SET status = 'TERMINATED',
                    updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [id]
        );

        // Recalculate room
        await recalculateRoomStatus(contract.room_id);

        // 🔔 SEND NOTIFICATION TO STUDENT
        await sendNotification(
            contract.student_id,
            "Sutartis nutraukta",
            `Jūsų sutartis dėl kambario ${contract.room_number} bendrabutyje „${contract.dormitory_name}“ buvo nutraukta.`
        );

        res.json({ success: true, message: "Sutartis nutraukta" });

    } catch (err) {
        console.error("Terminate contract error:", err);
        res.status(500).json({ success: false, message: "Serverio klaida" });
    }
};

/* ============================================================
   EXTEND CONTRACT + SEND NOTIFICATION
============================================================ */
export const extendContract = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_end_date } = req.body;

        if (!new_end_date)
            return res.status(400).json({
                success: false,
                message: "Nenurodyta nauja pabaigos data"
            });

        const result = await query(
            `SELECT
                 c.*,
                 r.room_number,
                 d.name AS dormitory_name
             FROM contracts c
                      JOIN rooms r ON c.room_id = r.id
                      JOIN dormitories d ON r.dormitory_id = d.id
             WHERE c.id = $1`,
            [id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({
                success: false,
                message: "Sutartis nerasta"
            });

        const contract = result.rows[0];

        // Paverčiame tik į YYYY-MM-DD formą
        const currentEnd = String(contract.end_date).split("T")[0];
        const newEnd = String(new_end_date).split("T")[0];

        // Lyginame tiesiogiai stringus — tai SAUGIAUSIAS būdas
        if (newEnd <= currentEnd) {
            return res.status(400).json({
                success: false,
                message: `Nauja pabaigos data turi būti vėlesnė už dabartinę`
            });
        }

        // Atnaujinimas
        await query(
            `UPDATE contracts
             SET end_date = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [newEnd, id]
        );

        // Notifikacija studentui
        await sendNotification(
            contract.student_id,
            "Sutartis pratęsta",
            `Jūsų sutartis dėl kambario ${contract.room_number} buvo pratęsta iki ${newEnd}.`
        );

        res.json({ success: true, message: "Sutartis pratęsta" });

    } catch (err) {
        console.error("Extend contract error:", err);
        res.status(500).json({
            success: false,
            message: "Serverio klaida"
        });
    }
};
