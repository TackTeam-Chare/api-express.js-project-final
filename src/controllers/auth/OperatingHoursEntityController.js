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

const createOperatingHours = async (req, res) => {
    const { place_id, day_of_week, opening_time, closing_time } = req.body;

    // Validate required fields
    if (!place_id || !day_of_week || !opening_time || !closing_time) {
        return res.status(400).json({
            error: 'place_id, day_of_week, opening_time, and closing_time are required.'
        });
    }

    // Validate day_of_week
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (!validDays.includes(day_of_week)) {
        return res.status(400).json({
            error: `Invalid day_of_week. Must be one of: ${validDays.join(', ')}`
        });
    }

    // Validate that opening_time is earlier than closing_time
    if (opening_time >= closing_time) {
        return res.status(400).json({
            error: 'opening_time must be earlier than closing_time.'
        });
    }

    // Check for overlapping hours for the same place and day
    try {
        const checkQuery = `SELECT * FROM operating_hours WHERE place_id = ? AND day_of_week = ? AND (
            (opening_time <= ? AND closing_time > ?) OR
            (opening_time < ? AND closing_time >= ?)
        )`;
        const [overlappingHours] = await pool.query(checkQuery, [place_id, day_of_week, closing_time, opening_time, closing_time, opening_time]);

        if (overlappingHours.length > 0) {
            return res.status(409).json({
                error: 'Operating hours overlap with an existing entry for this place and day.'
            });
        }

        // Proceed to create the new operating hours
        const query = 'INSERT INTO operating_hours SET ?';
        const [result] = await pool.query(query, { place_id, day_of_week, opening_time, closing_time });
        res.json({
            message: 'Operating hours created successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error creating operating hours:', error);
        res.status(500).json({
            error: error.message
        });
    }
};


const updateOperatingHours = async (req, res) => {
    const id = req.params.id;
    const { place_id, day_of_week, opening_time, closing_time } = req.body;

    // Validate required fields
    if (!place_id || !day_of_week || !opening_time || !closing_time) {
        return res.status(400).json({
            error: 'place_id, day_of_week, opening_time, and closing_time are required.'
        });
    }

    // Validate day_of_week
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (!validDays.includes(day_of_week)) {
        return res.status(400).json({
            error: `Invalid day_of_week. Must be one of: ${validDays.join(', ')}`
        });
    }

    // Validate that opening_time is earlier than closing_time
    if (opening_time >= closing_time) {
        return res.status(400).json({
            error: 'opening_time must be earlier than closing_time.'
        });
    }

    // Check for overlapping hours for the same place and day (excluding the current entry being updated)
    try {
        const checkQuery = `SELECT * FROM operating_hours WHERE place_id = ? AND day_of_week = ? AND id != ? AND (
            (opening_time <= ? AND closing_time > ?) OR
            (opening_time < ? AND closing_time >= ?)
        )`;
        const [overlappingHours] = await pool.query(checkQuery, [place_id, day_of_week, id, closing_time, opening_time, closing_time, opening_time]);

        if (overlappingHours.length > 0) {
            return res.status(409).json({
                error: 'Operating hours overlap with an existing entry for this place and day.'
            });
        }

        // Proceed to update the operating hours
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
        const query = 'SELECT * FROM operating_hours WHERE id = ?';
        const [rows] = await pool.query(query, [id]);
        const operatingHours = rows[0];

        if (operatingHours) {
            res.json(operatingHours);
        } else {
            res.status(404).json({
                error: 'Operating hours not found for the tourist entity'
            });
        }
    } catch (error) {
        console.error('Error fetching operating hours:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

const getTouristEntitiesByTime = async (req, res) => {
    try {
        const { day_of_week, opening_time, closing_time } = req.params;
        console.log('Request parameters:', day_of_week, opening_time, closing_time);

        let query = `
            SELECT 
                te.*,
                d.name AS district_name,
                GROUP_CONCAT(
                    DISTINCT CONCAT(
                        oh.day_of_week, ': ', 
                        TIME_FORMAT(oh.opening_time, '%h:%i %p'), ' - ', 
                        TIME_FORMAT(oh.closing_time, '%h:%i %p')
                    ) ORDER BY oh.day_of_week SEPARATOR '\n'
                ) AS operating_hours,
                (SELECT image_path FROM tourism_entities_images WHERE tourism_entities_id = te.id LIMIT 1) AS image_url
            FROM
                tourist_entities te
                JOIN district d ON te.district_id = d.id
                LEFT JOIN operating_hours oh ON te.id = oh.place_id
            WHERE
                1 = 1
        `;
        const params = [];
        if (day_of_week && opening_time && closing_time) {
            query += `
                AND oh.day_of_week = ?
                AND oh.opening_time <= ?
                AND oh.closing_time >= ?
            `;
            params.push(day_of_week, opening_time, closing_time);
        }
        query += `
            GROUP BY 
                te.id
        `;
        const [rows] = await pool.query(query, params);
        console.log('Entities fetched:', rows);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching tourist entities by time:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

export default {
    getAllOperatingHours,
    createOperatingHours,
    updateOperatingHours,
    deleteOperatingHours,
    getOperatingHoursById,
    getTouristEntitiesByTime
};
