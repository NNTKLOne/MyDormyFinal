import { query } from '../config/database.js';
import { recalculateRoomStatus } from './roomController.js';
import { sendNotification } from '../services/notificationService.js';

/* ============================================================
   GET CONTRACTS FOR DORM ADMIN
============================================================ */
export const getDormAdminContracts = async (req, res) => {
    try {
        const result = await query(
            `SELECT
                 c.*,
                 r.room_number,
                 r.capacity,
                 r.floor,
                 r.room_type,
                 d.id as dormitory_id,
                 d.name as dormitory_name,
                 d.address as dormitory_address,
                 u.first_name,
                 u.last_name,
                 u.email
             FROM contracts c
                      JOIN rooms r ON c.room_id = r.id
                      JOIN dormitories d ON r.dormitory_id = d.id
                      JOIN users u ON c.student_id = u.id
             WHERE d.admin_id = $1
               AND c.status IN ('SIGNED', 'ACTIVE', 'TERMINATED', 'EXPIRED')
             ORDER BY c.created_at DESC`,
            [req.user.id]
        );

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Get dorm admin contracts error:', error);
        res.status(500).json({
            success: false,
            message: 'Serverio klaida'
        });
    }
};


/* ============================================================
   UPDATE CONTRACT STATUS BY DORM ADMIN (APPROVE/REJECT)
============================================================ */
export const updateContractStatusByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // APPROVE or REJECT

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Neteisingas veiksmas'
      });
    }

    // Get contract + room + dorm info
    const contractRes = await query(
        `SELECT 
          c.*,
          r.room_number,
          r.dormitory_id,
          d.name AS dormitory_name
       FROM contracts c
       JOIN rooms r ON c.room_id = r.id
       JOIN dormitories d ON r.dormitory_id = d.id
       WHERE c.id = $1`,
        [id]
    );

    if (contractRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sutartis nerasta'
      });
    }

    const contract = contractRes.rows[0];

    // Check permission
    const dormRes = await query(
        `SELECT admin_id FROM dormitories WHERE id = $1`,
        [contract.dormitory_id]
    );

    if (
        dormRes.rows.length === 0 ||
        dormRes.rows[0].admin_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Neturite teisės keisti šios sutarties'
      });
    }

    /* ------------------------------
       APPROVE
    ------------------------------ */
    if (action === 'APPROVE') {
      if (contract.status !== 'SIGNED') {
        return res.status(400).json({
          success: false,
          message: 'Patvirtinti galima tik pasirašytas sutartis'
        });
      }

      // Check free beds
      const capacityCheck = await query(
          `SELECT 
           r.capacity,
           COALESCE((
             SELECT COUNT(*) 
             FROM contracts c2 
             WHERE c2.room_id = r.id 
               AND c2.status = 'ACTIVE'
           ), 0) AS active_residents
         FROM rooms r
         WHERE r.id = $1`,
          [contract.room_id]
      );

      const { capacity, active_residents } = capacityCheck.rows[0];
      const freeBeds = capacity - active_residents;

      if (freeBeds <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Kambaryje nebėra laisvų vietų – sutarties patvirtinti negalima'
        });
      }

      // Approve contract
      await query(
          `UPDATE contracts
         SET status = 'ACTIVE'
         WHERE id = $1`,
          [id]
      );

      // Mark related inspection completed
      const inspectionRes = await query(
          `SELECT id
         FROM inspections
         WHERE student_id = $1
           AND room_id = $2
           AND status = 'APPROVED'
         ORDER BY inspection_date DESC, inspection_time DESC
         LIMIT 1`,
          [contract.student_id, contract.room_id]
      );

      if (inspectionRes.rows.length > 0) {
        await query(
            `UPDATE inspections
           SET status = 'COMPLETED'
           WHERE id = $1`,
            [inspectionRes.rows[0].id]
        );
      }

      // Recalculate room
      await recalculateRoomStatus(contract.room_id);

      // 🔔 SEND NOTIFICATION
      await sendNotification(
          contract.student_id,
          "Sutartis patvirtinta",
          `Jūsų sutartis dėl kambario ${contract.room_number} bendrabutyje „${contract.dormitory_name}“ buvo patvirtinta.`
      );

      return res.json({
        success: true,
        message: 'Sutartis patvirtinta'
      });
    }

    /* ------------------------------
       REJECT
    ------------------------------ */
    if (action === 'REJECT') {
      if (contract.status !== 'SIGNED') {
        return res.status(400).json({
          success: false,
          message: 'Atmesti galima tik pasirašytas sutartis'
        });
      }

      await query(
          `UPDATE contracts
         SET status = 'REJECTED'
         WHERE id = $1`,
          [id]
      );

      const inspectionRes = await query(
          `SELECT id
         FROM inspections
         WHERE student_id = $1
         AND room_id = $2
         AND status = 'APPROVED'
         ORDER BY inspection_date DESC, inspection_time DESC
         LIMIT 1`,
              [contract.student_id, contract.room_id]
         );

          // 3. Jei yra tokia apžiūra — žymime kaip REJECTED
            if (inspectionRes.rows.length > 0) {
                await query(
                    `UPDATE inspections
               SET status = 'REJECTED'
               WHERE id = $1`,
                    [inspectionRes.rows[0].id]
                );
      }

      await recalculateRoomStatus(contract.room_id);

      // 🔔 SEND NOTIFICATION
      await sendNotification(
          contract.student_id,
          "Sutartis atmesta",
          `Jūsų sutartis dėl kambario ${contract.room_number} bendrabutyje „${contract.dormitory_name}“ buvo atmesta.`
      );

      return res.json({
        success: true,
        message: 'Sutartis atmesta'
      });
    }
  } catch (error) {
    console.error('Update contract by admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};


/* ============================================================
   GET MY CONTRACTS (STUDENT)
============================================================ */
export const getMyContracts = async (req, res) => {
  try {
    const result = await query(
        `SELECT 
        c.*,
        r.room_number,
        r.capacity,
        r.occupied_beds,
        r.floor,
        r.room_type,
        r.description as room_description,
        r.amenities,
        d.name as dormitory_name,
        d.address as dormitory_address
       FROM contracts c
       JOIN rooms r ON c.room_id = r.id
       JOIN dormitories d ON r.dormitory_id = d.id
       WHERE c.student_id = $1
       ORDER BY c.created_at DESC`,
        [req.user.id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};


/* ============================================================
   GET MY ROOM (IF ACTIVE RESIDENT)
============================================================ */
export const getMyRoom = async (req, res) => {
  try {
    const result = await query(
        `SELECT 
        c.id as contract_id,
        c.contract_number,
        c.start_date,
        c.end_date,
        c.monthly_price,
        c.status as contract_status,
        c.signed_at,
        r.id as room_id,
        r.room_number,
        r.capacity,
        r.occupied_beds,
        r.floor,
        r.room_type,
        r.description,
        r.amenities,
        r.images,
        d.name as dormitory_name,
        d.address as dormitory_address,
        (
          SELECT json_agg(json_build_object(
            'id', u2.id,
            'first_name', u2.first_name,
            'last_name', u2.last_name,
            'email', u2.email,
            'study_program', u2.study_program
          ))
          FROM contracts c2
          JOIN users u2 ON u2.id = c2.student_id
          WHERE c2.room_id = r.id 
            AND c2.status IN ('ACTIVE', 'SIGNED')
            AND c2.student_id != $1
        ) as roommates
       FROM contracts c
       JOIN rooms r ON c.room_id = r.id
       JOIN dormitories d ON r.dormitory_id = d.id
       WHERE c.student_id = $1 
         AND c.status IN ('ACTIVE', 'SIGNED', 'DRAFT')
       LIMIT 1`,
        [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Neturite aktyvios rezervacijos ar sutarties'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get my room error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};


/* ============================================================
   SIGN CONTRACT (STUDENT)
============================================================ */
export const signContract = async (req, res) => {
  try {
    const { id } = req.params;

    const contractCheck = await query(
        `SELECT
           c.*,
           r.capacity,
           r.occupied_beds,
           r.room_number,
           r.dormitory_id,
           d.name AS dormitory_name
         FROM contracts c
                JOIN rooms r ON c.room_id = r.id
                JOIN dormitories d ON r.dormitory_id = d.id
         WHERE c.id = $1 AND c.student_id = $2`,
        [id, req.user.id]
    );

    if (contractCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sutartis nerasta'
      });
    }

    const contract = contractCheck.rows[0];

    if (contract.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Sutartis jau pasirašyta arba nebeaktyvi'
      });
    }

    // Check free beds
    const capacityCheck = await query(
        `SELECT
           r.capacity,
           COALESCE((
                      SELECT COUNT(*)
                      FROM contracts c2
                      WHERE c2.room_id = r.id
                        AND c2.status = 'ACTIVE'
                    ), 0) AS active_residents
         FROM rooms r
         WHERE r.id = $1`,
        [contract.room_id]
    );

    const { capacity, active_residents } = capacityCheck.rows[0];
    const freeBeds = capacity - active_residents;

    if (freeBeds <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Kambaryje nebėra laisvų vietų'
      });
    }

    // Set end date (June 30 logic)
    const today = new Date();
    let endYear = today.getFullYear();

    const june30 = new Date(endYear, 5, 30);
    if (today > june30) endYear += 1;

    const endDate = new Date(endYear, 5, 30);

    // Sign contract
    await query(
        `UPDATE contracts 
       SET 
        status = 'SIGNED',
        signed_at = CURRENT_TIMESTAMP,
        end_date = $1
       WHERE id = $2`,
        [endDate, id]
    );

    await recalculateRoomStatus(contract.room_id);


    res.json({
      success: true,
      message: 'Sutartis pasirašyta. Laukiama bendrabučio administratoriaus patvirtinimo.'
    });

  } catch (error) {
    console.error('Sign contract error:', error);
    res.status(500).json({
      success: false,
      message: 'Serverio klaida'
    });
  }
};
