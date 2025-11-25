import { query } from '../config/database.js';
import bcrypt from 'bcrypt';

export const createUser = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            user_type,
            faculty,
            study_program,
            student_id,
            phone,
            address,
            dormitory_ids
        } = req.body;

        // 1. Bazinė validacija
        if (!first_name || !last_name || !email || !user_type) {
            return res.status(400).json({
                success: false,
                message: 'Prašome užpildyti visus privalomus laukus'
            });
        }

        const allowedTypes = ['STUDENT', 'DORMITORY_ADMIN', 'SUPERVISOR'];
        if (!allowedTypes.includes(user_type)) {
            return res.status(400).json({
                success: false,
                message: 'Netinkamas vartotojo tipas'
            });
        }

        // 2. Tikriname ar email jau naudojamas
        const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Vartotojas su tokiu el. paštu jau egzistuoja'
            });
        }

        // 3. Kontaktinė informacija
        let contactId = null;
        if (phone || address) {
            const contactRes = await query(
                `INSERT INTO contact_information (phone, email, address)
                 VALUES ($1, $2, $3)
                 RETURNING id`,
                [phone || null, email, address || null]
            );
            contactId = contactRes.rows[0].id;
        }

        // 4. Laikinas slaptažodis
        const tempPassword = Math.random().toString(36).slice(-10);
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const mustChange = true;

        // 5. Įrašome vartotoją
        const userRes = await query(
            `INSERT INTO users (
                first_name,
                last_name,
                email,
                password_hash,
                user_type,
                contact_id,
                faculty,
                study_program,
                student_id,
                must_change_password
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING id, first_name, last_name, email, user_type`,
            [
                first_name,
                last_name,
                email,
                passwordHash,
                user_type,
                contactId,
                faculty || null,
                study_program || null,
                student_id || null,
                mustChange
            ]
        );

        const newUser = userRes.rows[0];

        // 6. Bendrabučių priskyrimas (tik administratoriams)
        if (user_type === 'DORMITORY_ADMIN' && Array.isArray(dormitory_ids)) {
            await query(
                `UPDATE dormitories
                 SET admin_id = $1
                 WHERE id = ANY($2::int[])`,
                [newUser.id, dormitory_ids]
            );
        }

        // 7. Laiško siuntimas -> vietoj SMTP rašome i console
        console.log("*********************");
        console.log("NAUJAS SUKURTAS VARTOTOJAS");
        console.log("Vardas:", first_name, last_name);
        console.log("Email:", email);
        console.log("Laikinas slaptažodis:", tempPassword);
        console.log("Vartotojo tipas:", user_type);
        console.log("*********************");

        return res.status(201).json({
            success: true,
            message: 'Paskyra sukurta (DEV režimu – laiškas parodytas console.log)',
            data: newUser
        });

    } catch (error) {
        console.error('createUser error:', error);
        return res.status(500).json({
            success: false,
            message: 'Serverio klaida kuriant paskyrą'
        });
    }
};
