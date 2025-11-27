import { query } from '../config/database.js';
import { recalculateRoomStatus } from './roomController.js';


// @desc    Get contracts for dormitory admin (tik jo bendrabučių)
// @route   GET /api/contracts/admin
// @access  Private (Dormitory Admin)
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

// @desc    Change contract status by dormitory admin (approve / reject)
// @route   PUT /api/contracts/:id/admin-status
// @access  Private (Dormitory Admin)
export const updateContractStatusByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' arba 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Neteisingas veiksmas'
      });
    }

    // Pasiimam sutartį su kambariu ir bendrabučiu
    const contractRes = await query(
      `SELECT c.*, r.dormitory_id
       FROM contracts c
       JOIN rooms r ON c.room_id = r.id
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

    // Tik to bendrabučio adminas gali tvarkyt
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

    if (action === 'APPROVE') {
      if (contract.status !== 'SIGNED') {
        return res.status(400).json({
          success: false,
          message: 'Patvirtinti galima tik pasirašytas sutartis'
        });
      }

      // Patikrinam, kad dar yra vietų (pagal ACTIVE sutartis)
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

      // 1) Patvirtinam sutartį
      await query(
        `UPDATE contracts
         SET status = 'ACTIVE'
         WHERE id = $1`,
        [id]
      );
      
      // Atnaujinam susijusią kontaktinę informaciją su bendrabučio adresu
      const contactRes = await query(
        `SELECT 
           u.contact_id,
           d.address AS dorm_address
         FROM contracts c
         JOIN users u ON c.student_id = u.id
         JOIN rooms r ON c.room_id = r.id
         JOIN dormitories d ON r.dormitory_id = d.id
         WHERE c.id = $1`,
        [id]
      );

      if (contactRes.rows.length > 0) {
        const { contact_id, dorm_address } = contactRes.rows[0];

        if (contact_id && dorm_address) {
          await query(
            `UPDATE contact_information
             SET address = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [dorm_address, contact_id]
          );
        }
      }

      // 2) Randam susijusią apžiūrą ir ją pažymim kaip COMPLETED
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
        const inspectionId = inspectionRes.rows[0].id;

        await query(
          `UPDATE inspections
           SET status = 'COMPLETED'
           WHERE id = $1`,
          [inspectionId]
        );
      }

      // 3) Perskaičiuojam kambario statusą
      await recalculateRoomStatus(contract.room_id);

      return res.json({
        success: true,
        message: 'Sutartis patvirtinta'
      });
    }

    if (action === 'REJECT') {
      if (contract.status !== 'SIGNED') {
        return res.status(400).json({
          success: false,
          message: 'Atmesti galima tik pasirašytas, bet dar nepatvirtintas sutartis'
        });
      }

      // Atmetam – žymim kaip TERMINATED
      await query(
        `UPDATE contracts
         SET status = 'TERMINATED'
         WHERE id = $1`,
        [id]
      );

      // Perskaičiuojam kambario statusą
      await recalculateRoomStatus(contract.room_id);

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


// @desc    Get my contracts
// @route   GET /api/contracts/my
// @access  Private (Student)
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

// @desc    Get my current room (if I'm a resident)
// @route   GET /api/contracts/my-room
// @access  Private (Student)
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

// @desc    Sign contract (studentas pasirašo, laukia admino patvirtinimo)
// @route   PUT /api/contracts/:id/sign
// @access  Private (Student)
export const signContract = async (req, res) => {
  try {
    const { id } = req.params;

    const contractCheck = await query(
        `SELECT c.*, r.capacity, r.occupied_beds, r.dormitory_id
         FROM contracts c
                JOIN rooms r ON c.room_id = r.id
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

    // Vietų patikrinimas
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

    // -------------------------------
    //   SET END DATE TO YYYY-06-30
    // -------------------------------
    const today = new Date();
    let endYear = today.getFullYear();

    // jei šiandien jau po birželio 30 → baigsis kitais metais
    const june30 = new Date(endYear, 5, 30); // mėnesiai nuo 0

    if (today > june30) {
      endYear += 1;
    }

    const endDate = new Date(endYear, 5, 30);

    // Student signs contract
    await query(
        `UPDATE contracts 
       SET 
        status = 'SIGNED',
        signed_at = CURRENT_TIMESTAMP,
        end_date = $1
       WHERE id = $2`,
        [endDate, id]
    );

    // Recalculate room status
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
