import pool from '../../config/db.js';

const getAllOperatingHours = async (req, res) => {
  try {
      const query = `
          SELECT 
              oh.*, 
              te.name AS place_name 
          FROM 
              operating_hours oh 
          JOIN 
              tourist_entities te 
          ON 
              oh.place_id = te.id
          ORDER BY 
              oh.id DESC
      `;
      const [operatingHours] = await pool.query(query);
      res.json(operatingHours);
  } catch (error) {
      console.error('Error fetching operating hours:', error);
      res.status(500).json({
          error: 'Internal server error'
      });
  }
};


// const createOperatingHours = async (req, res) => {
//     const { place_id, day_of_week, opening_time, closing_time } = req.body;

//     // Validate required fields
//     if (!place_id || !day_of_week || !opening_time || !closing_time) {
//         return res.status(400).json({
//             error: 'place_id, day_of_week, opening_time, and closing_time are required.'
//         });
//     }

//     // Validate day_of_week
//     const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
//     if (!validDays.includes(day_of_week)) {
//         return res.status(400).json({
//             error: `Invalid day_of_week. Must be one of: ${validDays.join(', ')}`
//         });
//     }

//     // Validate that opening_time is earlier than closing_time
//     if (opening_time >= closing_time) {
//         return res.status(400).json({
//             error: 'opening_time must be earlier than closing_time.'
//         });
//     }

//     // Check for overlapping hours for the same place and day
//     try {
//         const checkQuery = `SELECT * FROM operating_hours WHERE place_id = ? AND day_of_week = ? AND (
//             (opening_time <= ? AND closing_time > ?) OR
//             (opening_time < ? AND closing_time >= ?)
//         )`;
//         const [overlappingHours] = await pool.query(checkQuery, [place_id, day_of_week, closing_time, opening_time, closing_time, opening_time]);

//         if (overlappingHours.length > 0) {
//             return res.status(409).json({
//                 error: 'Operating hours overlap with an existing entry for this place and day.'
//             });
//         }

//         // Proceed to create the new operating hours
//         const query = 'INSERT INTO operating_hours SET ?';
//         const [result] = await pool.query(query, { place_id, day_of_week, opening_time, closing_time });
//         res.json({
//             message: 'Operating hours created successfully',
//             id: result.insertId
//         });
//     } catch (error) {
//         console.error('Error creating operating hours:', error);
//         res.status(500).json({
//             error: error.message
//         });
//     }
// };

//   support for both Everyday and Except Holidays

const createOperatingHours = async (req, res) => {
    const { place_id, day_of_week, opening_time, closing_time } = req.body;
  
    // Validate required fields
    if (!place_id || !day_of_week || !opening_time || !closing_time) {
      return res.status(400).json({
        error: 'place_id, day_of_week, opening_time, and closing_time are required.',
      });
    }
  
    // Define the valid days of the week
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
    // If 'Everyday' is selected, map it to all days of the week
    const daysToInsert = day_of_week === 'Everyday' 
      ? validDays 
      : day_of_week === 'Except Holidays' 
      ? validDays  // Assuming "holidays" are handled externally
      : [day_of_week];
  
    // Insert operating hours for each selected day
    try {
      const conn = await pool.getConnection();
      await conn.beginTransaction();
  
      // Loop through each day in the `daysToInsert` array
      for (const day of daysToInsert) {
        // Check for overlapping hours for the same place and day
        const checkQuery = `
          SELECT * FROM operating_hours 
          WHERE place_id = ? AND day_of_week = ? 
          AND (opening_time <= ? AND closing_time >= ?)
        `;
        const [overlappingHours] = await conn.query(checkQuery, [place_id, day, closing_time, opening_time]);
  
        if (overlappingHours.length > 0) {
          await conn.rollback();
          return res.status(409).json({ error: `Operating hours overlap on ${day}.` });
        }
  
        // Proceed to insert the new operating hours for the current day
        const insertQuery = `
          INSERT INTO operating_hours (place_id, day_of_week, opening_time, closing_time) 
          VALUES (?, ?, ?, ?)
        `;
        await conn.query(insertQuery, [place_id, day, opening_time, closing_time]);
      }
  
      await conn.commit();
      res.json({ message: 'Operating hours created successfully for all selected days.' });
    } catch (error) {
      console.error('Error creating operating hours:', error);
      await conn.rollback();
      res.status(500).json({ error: error.message });
    } finally {
      conn.release();
    }
  };
  
// const updateOperatingHours = async (req, res) => {
//     const id = req.params.id;
//     const { place_id, day_of_week, opening_time, closing_time } = req.body;

//     // Validate required fields
//     if (!place_id || !day_of_week || !opening_time || !closing_time) {
//         return res.status(400).json({
//             error: 'place_id, day_of_week, opening_time, and closing_time are required.'
//         });
//     }

//     // Validate day_of_week
//     const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
//     if (!validDays.includes(day_of_week)) {
//         return res.status(400).json({
//             error: `Invalid day_of_week. Must be one of: ${validDays.join(', ')}`
//         });
//     }

//     // Validate that opening_time is earlier than closing_time
//     if (opening_time >= closing_time) {
//         return res.status(400).json({
//             error: 'opening_time must be earlier than closing_time.'
//         });
//     }

//     // Check for overlapping hours for the same place and day (excluding the current entry being updated)
//     try {
//         const checkQuery = `SELECT * FROM operating_hours WHERE place_id = ? AND day_of_week = ? AND id != ? AND (
//             (opening_time <= ? AND closing_time > ?) OR
//             (opening_time < ? AND closing_time >= ?)
//         )`;
//         const [overlappingHours] = await pool.query(checkQuery, [place_id, day_of_week, id, closing_time, opening_time, closing_time, opening_time]);

//         if (overlappingHours.length > 0) {
//             return res.status(409).json({
//                 error: 'Operating hours overlap with an existing entry for this place and day.'
//             });
//         }

//         // Proceed to update the operating hours
//         const query = 'UPDATE operating_hours SET ? WHERE id = ?';
//         const [result] = await pool.query(query, [{ place_id, day_of_week, opening_time, closing_time }, id]);
//         if (result.affectedRows > 0) {
//             res.json({ message: `Operating hours with ID ${id} updated successfully` });
//         } else {
//             res.status(404).json({ error: 'Operating hours not found' });
//         }
//     } catch (error) {
//         console.error('Error updating operating hours:', error);
//         res.status(500).json({
//             error: error.message
//         });
//     }
// };

const updateOperatingHours = async (req, res) => {
  const id = req.params.id;
  const { place_id, day_of_week, opening_time, closing_time } = req.body;

  try {
      // Proceed to update the operating hours directly
      const query = 'UPDATE operating_hours SET ? WHERE id = ?';
      const [result] = await pool.query(query, [{ place_id, day_of_week, opening_time, closing_time }, id]);

      if (result.affectedRows > 0) {
          res.json({ message: `Operating hours with ID ${id} updated successfully` });
      } else {
          res.status(404).json({ error: 'Operating hours not found' });
      }
  } catch (error) {
      console.error('Error updating operating hours:', error);
      res.status(500).json({
          error: error.message
      });
  }
};

// Delete an operating hours
const deleteOperatingHours = async (req, res) => {
    const id = req.params.id;
    try {
        const query = 'DELETE FROM operating_hours WHERE id = ?';
        const [result] = await pool.query(query, [id]);
        if (result.affectedRows > 0) {
            res.json({ message: `Operating hours with ID ${id} deleted successfully` });
        } else {
            res.status(404).json({ error: 'Operating hours not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getOperatingHoursById = async (req, res) => {
    try {
      const id = req.params.id;
      const query = `
        SELECT oh.*, te.name AS place_name 
        FROM operating_hours oh
        JOIN tourist_entities te ON te.id = oh.place_id
        WHERE oh.id = ?;
      `;
      const [rows] = await pool.query(query, [id]);
      const operatingHours = rows[0];
  
      if (operatingHours) {
        res.json(operatingHours);
      } else {
        res.status(404).json({
          error: 'Operating hours not found for the tourist entity',
        });
      }
    } catch (error) {
      console.error('Error fetching operating hours:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  };

export default {
    getAllOperatingHours,
    createOperatingHours,
    updateOperatingHours,
    deleteOperatingHours,
    getOperatingHoursById,
};
