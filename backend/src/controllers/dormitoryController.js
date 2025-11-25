import { query } from '../config/database.js';

export const getDormitoriesList = async (req, res) => {
    try {
        const result = await query(
            `SELECT id, name, address 
       FROM dormitories 
       ORDER BY name`
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Dormitory list error:", error);
        res.status(500).json({ success: false, message: "Serverio klaida" });
    }
};
