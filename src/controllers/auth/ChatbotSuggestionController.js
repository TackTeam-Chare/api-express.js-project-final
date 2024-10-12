import pool from '../../config/db.js';

// Get all chatbot suggestions
const getAllChatbotSuggestions = async (req, res) => {
    try {
        const query = 'SELECT * FROM chatbot_suggestions';
        const [suggestions] = await pool.query(query);
        res.json(suggestions);
    } catch (error) {
        console.error('Error fetching chatbot suggestions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get chatbot suggestion by ID
const getChatbotSuggestionById = async (req, res) => {
    try {
        const id = req.params.id;
        const query = 'SELECT * FROM chatbot_suggestions WHERE id = ?';
        const [rows] = await pool.query(query, [id]);
        const suggestion = rows[0];

        if (suggestion) {
            res.json(suggestion);
        } else {
            res.status(404).json({ error: 'Suggestion not found' });
        }
    } catch (error) {
        console.error('Error fetching chatbot suggestion:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create a new chatbot suggestion
const createChatbotSuggestion = async (req, res) => {
  const { category, suggestion_text, active } = req.body;
  try {
    // Check if the suggestion already exists
    const checkQuery = 'SELECT COUNT(*) as count FROM chatbot_suggestions WHERE category = ? AND suggestion_text = ?';
    const [rows] = await pool.query(checkQuery, [category, suggestion_text]);
    const suggestionExists = rows[0].count > 0;

    if (suggestionExists) {
      return res.status(409).json({ // Return status 409 for duplicates
        status: 'duplicate',
        message: 'This suggestion already exists. Please choose a different suggestion.',
      });
    }

    // If the suggestion doesn't exist, insert it
    const query = 'INSERT INTO chatbot_suggestions (category, suggestion_text, active) VALUES (?, ?, ?)';
    const [result] = await pool.query(query, [category, suggestion_text, active ? 1 : 0]);
    res.status(201).json({
      message: 'Chatbot suggestion created successfully',
      id: result.insertId,
    });
  } catch (error) {
    console.error('Error creating chatbot suggestion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Update a chatbot suggestion
const updateChatbotSuggestion = async (req, res) => {
    const id = req.params.id;
    const { category, suggestion_text, active } = req.body;
    try {
      const query = 'UPDATE chatbot_suggestions SET category = ?, suggestion_text = ?, active = ? WHERE id = ?';
      const [result] = await pool.query(query, [category, suggestion_text, active, id]);
  
      if (result.affectedRows > 0) {
        res.json({ message: `Chatbot suggestion with ID ${id} updated successfully` });
      } else {
        res.status(404).json({ error: 'Suggestion not found' });
      }
    } catch (error) {
      console.error('Error updating chatbot suggestion:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  

// Delete a chatbot suggestion
const deleteChatbotSuggestion = async (req, res) => {
    const id = req.params.id;
    try {
        const query = 'DELETE FROM chatbot_suggestions WHERE id = ?';
        const [result] = await pool.query(query, [id]);

        if (result.affectedRows > 0) {
            res.json({ message: `Chatbot suggestion with ID ${id} deleted successfully` });
        } else {
            res.status(404).json({ error: 'Suggestion not found' });
        }
    } catch (error) {
        console.error('Error deleting chatbot suggestion:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export default {
    getAllChatbotSuggestions,
    getChatbotSuggestionById,
    createChatbotSuggestion,
    updateChatbotSuggestion,
    deleteChatbotSuggestion
};
