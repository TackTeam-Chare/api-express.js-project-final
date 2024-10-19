import pool from '../../config/db.js';

const getSuggestions = async (req, res) => {
  try {
    // Query the database for all active suggestions
    const [rows] = await pool.query(`SELECT suggestion_text FROM chatbot_suggestions WHERE active = 1 ORDER BY created_at DESC`);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
};

export default {
  getSuggestions,
};
