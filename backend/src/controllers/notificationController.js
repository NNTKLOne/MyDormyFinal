import { query } from "../config/database.js";

export const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `
        SELECT *
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
            [userId]
        );

        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("GET NOTIFICATIONS ERROR:", err);
        res.status(500).json({ success: false, message: "Serverio klaida" });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const notifId = req.params.id;
        const userId = req.user.id;

        await query(
            `
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = $1 AND user_id = $2
      `,
            [notifId, userId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("MARK AS READ ERROR:", err);
        res.status(500).json({ success: false, message: "Serverio klaida" });
    }
};

export const unreadCount = async (req, res) => {
    try {
        const result = await query(
            `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
            [req.user.id]
        );

        res.json({ success: true, count: Number(result.rows[0].count) });
    } catch (err) {
        console.error("UNREAD COUNT ERROR:", err);
        res.status(500).json({ success: false });
    }
};
