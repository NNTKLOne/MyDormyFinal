// controllers/dormitoryController.js

import { query } from '../config/database.js';

// @desc    Get all dormitories
// @route   GET /api/dormitories
// @access  Private (University Admin)
export const getAllDormitories = async (req, res) => {
    try {
        const result = await query(`
      SELECT 
        id, 
        name, 
        address,
        admin_id,
        supervisor_id
      FROM dormitories
      ORDER BY id ASC
    `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error("Get dormitories error:", error);
        res.status(500).json({
            success: false,
            message: "Serverio klaida gaunant bendrabučius"
        });
    }
};
