import { query } from "../config/database.js";

export async function sendNotification(userId, title, message = null) {
    await query(
        `
            INSERT INTO notifications (user_id, title, message)
            VALUES ($1, $2, $3)
        `,
        [userId, title, message]
    );
}

