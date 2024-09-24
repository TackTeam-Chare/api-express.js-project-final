import pool from '../config/db.js';
import axios from 'axios';

/**
 * This function processes user questions, queries the database, and fetches external data if necessary.
 */
const processChatbotQuestion = async (questionData, socket) => {
  let dbResponse = ''; // Response from the database
  let hasRelevantData = false; // Flag to track if relevant data was found

  const question = questionData.text; // Extract the text part of the question
  const userLocation = questionData.location || null; // Extract location if available

  try {
    // 1. Check for nearby places currently open
    if (question.includes("สถานที่ที่เปิดตอนนี้")) {
      hasRelevantData = await handleOpenPlacesQuery(socket);
    }

    // 2. Check for nearby places based on user's location
    if (question.includes("สถานที่ใกล้เคียงตอนนี้")) {
      if (userLocation) {
        hasRelevantData = await handleNearbyPlacesQuery(socket, userLocation);
      } else {
        socket.emit('botMessage', 'ไม่พบพิกัดของคุณ');
      }
    }

    // 3. Check for seasonal places
    if (question.includes("สถานที่ตามฤดูกาล")) {
      hasRelevantData = await handleSeasonalPlacesQuery(socket);
    }

    // 4. Fallback to Google Places API if no relevant data found in the database
    if (!hasRelevantData) {
      hasRelevantData = await handleExternalAPIs(socket, question);
    }

  } catch (error) {
    console.error('Error processing chatbot question:', error);
    socket.emit('botMessage', 'เกิดข้อผิดพลาดในการประมวลผลคำถาม');
  }
};

/**
 * Handles querying open places from the database.
 */
const handleOpenPlacesQuery = async (socket) => {
  const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const currentDay = new Date().toLocaleString('en-GB', { weekday: 'long' });

  const [rows] = await pool.query(
    `SELECT te.name, te.description, te.id
     FROM tourist_entities te
     JOIN operating_hours oh ON te.id = oh.place_id
     WHERE oh.opening_time <= ? 
       AND oh.closing_time >= ? 
       AND oh.day_of_week = ?
     ORDER BY te.name ASC`,
    [currentTime, currentTime, currentDay]
  );

  if (rows.length > 0) {
    let dbResponse = 'สถานที่ที่เปิดตอนนี้:\n';
    rows.forEach(row => {
      dbResponse += `${row.name} - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
    });
    socket.emit('botMessage', dbResponse);
    return true;
  } else {
    socket.emit('botMessage', 'ไม่พบสถานที่ที่เปิดตอนนี้');
    return false;
  }
};

/**
 * Handles querying nearby places based on user location.
 */
const handleNearbyPlacesQuery = async (socket, location) => {
  const { latitude, longitude } = location;

  const [rows] = await pool.query(
    `SELECT te.name, te.description, te.id,
     (6371 * acos(cos(radians(?)) * cos(radians(te.latitude)) 
     * cos(radians(te.longitude) - radians(?)) + sin(radians(?)) * sin(radians(te.latitude)))) AS distance
     FROM tourist_entities te
     HAVING distance < 10
     ORDER BY distance LIMIT 10`,
    [latitude, longitude, latitude]
  );

  if (rows.length > 0) {
    let dbResponse = 'สถานที่ใกล้พิกัดของคุณภายใน 10 กิโลเมตร:\n';
    rows.forEach(row => {
      dbResponse += `${row.name} - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
    });
    socket.emit('botMessage', dbResponse);
    return true;
  } else {
    socket.emit('botMessage', 'ไม่พบสถานที่ใกล้เคียงในระยะ 10 กิโลเมตร');
    return false;
  }
};

/**
 * Handles querying seasonal places from the database.
 */
const handleSeasonalPlacesQuery = async (socket) => {
  const currentMonth = new Date().getMonth() + 1;

  const [rows] = await pool.query(
    `SELECT te.name, te.description, te.id
     FROM tourist_entities te
     JOIN seasons_relation sr ON te.id = sr.tourism_entities_id
     JOIN seasons s ON sr.season_id = s.id
     WHERE MONTH(s.date_start) <= ? AND MONTH(s.date_end) >= ?
     ORDER BY te.name ASC`,
    [currentMonth, currentMonth]
  );

  if (rows.length > 0) {
    let dbResponse = 'สถานที่แนะนำตามฤดูกาลในเดือนนี้:\n';
    rows.forEach(row => {
      dbResponse += `${row.name} - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
    });
    socket.emit('botMessage', dbResponse);
    return true;
  } else {
    socket.emit('botMessage', 'ไม่พบสถานที่ตามฤดูกาลในเดือนนี้');
    return false;
  }
};

/**
 * Handles external API fallbacks: Google Places and GPT-4.
 */
const handleExternalAPIs = async (socket, question) => {
  try {
    // Query Google Places API
    const externalPlaces = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: { query: question, key: process.env.GOOGLE_PLACES_API_KEY }
    });

    if (externalPlaces.data.results.length > 0) {
      let externalResponse = 'ข้อมูลจาก Google Places:\n';
      externalPlaces.data.results.forEach(place => {
        externalResponse += `${place.name}\n ลิ้งค์ไปยัง Google Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}\n\n`;
      });
      socket.emit('botMessage', externalResponse);
      return true;
    }

    // Fallback to GPT-4 if Google Places provides no data
    const gptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'user', content: question }],
    }, {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }
    });

    const aiMessage = gptResponse.data.choices[0].message.content;
    socket.emit('botMessage', aiMessage);
    return true;

  } catch (error) {
    console.error('Error in external API handling:', error);
    socket.emit('botMessage', 'ไม่สามารถดึงข้อมูลจากแหล่งภายนอกได้');
    return false;
  }
};

export default processChatbotQuestion;
