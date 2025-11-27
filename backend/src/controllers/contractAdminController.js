import { query } from "../config/database.js";
import { recalculateRoomStatus } from "./roomController.js";

export const getAllContracts = async (req, res) => {
    try {
        const result = await query(`
      SELECT 
        c.*,
        u.first_name,
        u.last_name,
        u.email,
        r.room_number,
        d.name AS dormitory_name
      FROM contracts c
      JOIN users u ON u.id = c.student_id
      JOIN rooms r ON r.id = c.room_id
      JOIN dormitories d ON d.id = r.dormitory_id
      ORDER BY c.created_at DESC
    `);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Get contracts error:", err);
        res.status(500).json({ success: false, message: "Serverio klaida" });
    }
};

export const terminateContract = async (req, res) => {
    try {
        const { id } = req.params;

        const contractRes = await query(
            `SELECT * FROM contracts WHERE id = $1`,
            [id]
        );

        if (contractRes.rows.length === 0)
            return res.status(404).json({ success: false, message: "Sutartis nerasta" });

        const contract = contractRes.rows[0];

        if (contract.status === "TERMINATED")
            return res.status(400).json({ success: false, message: "Sutartis jau likviduota" });

        await query(
            `UPDATE contracts
       SET status = 'TERMINATED',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
            [id]
        );

        // Perskaičiuoti kambario statusą
        await recalculateRoomStatus(contract.room_id);

        res.json({ success: true, message: "Sutartis likviduota" });

    } catch (err) {
        console.error("Terminate contract error:", err);
        res.status(500).json({ success: false, message: "Serverio klaida" });
    }
};

export const extendContract = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_end_date } = req.body;

        if (!new_end_date)
            return res.status(400).json({ success: false, message: "Nenurodyta nauja pabaigos data" });

        const contractRes = await query(
            `SELECT * FROM contracts WHERE id = $1`,
            [id]
        );

        if (contractRes.rows.length === 0)
            return res.status(404).json({ success: false, message: "Sutartis nerasta" });

        const contract = contractRes.rows[0];

        const currentEnd = new Date(contract.end_date);
        const newEnd = new Date(new_end_date);

        if (newEnd <= currentEnd)
            return res.status(400).json({
                success: false,
                message: "Galima tik pratęsti – pabaigos data turi būti vėlesnė nei dabartinė"
            });

        await query(
            `UPDATE contracts
        SET end_date = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
            [new_end_date, id]
        );

        res.json({ success: true, message: "Sutartis pratęsta" });

    } catch (err) {
        console.error("Extend contract error:", err);
        res.status(500).json({ success: false, message: "Serverio klaida" });
    }
};
