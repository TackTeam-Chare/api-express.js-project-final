import pool from '../config/db.js';
import axios from 'axios';

/**
 * Processes user questions, queries the database, and fetches external data if necessary.
 */
const processChatbotQuestion = async (questionData, socket) => {
  let dbResponse = ''; // Response from the database
  let hasRelevantData = false; // Flag to track if relevant data was found

  const question = questionData.text; // Extract the text part of the question
  const userLocation = questionData.location || null; // Extract the location if available

  try {

    //  Handle nearby places based on location
    if (userLocation) {
      const { latitude, longitude } = userLocation;
    
      // 1. Check if the question is about nearby tourist attractions
      if (question.includes("สถานที่ท่องเที่ยวใกล้เคียงฉันตอนนี้")) {
        const [rows] = await pool.query(
          `SELECT te.name, te.description, te.id,
           (6371 * acos(cos(radians(?)) * cos(radians(te.latitude)) 
           * cos(radians(te.longitude) - radians(?)) + sin(radians(?)) * sin(radians(te.latitude)))) AS distance
           FROM tourist_entities te
           JOIN categories c ON te.category_id = c.id
           WHERE c.name = 'สถานที่ท่องเที่ยว'
           HAVING distance < 10
           ORDER BY distance LIMIT 10`, 
          [latitude, longitude, latitude]
        );
    
        if (rows.length > 0) {
          dbResponse = `สถานที่ท่องเที่ยวใกล้พิกัดของคุณภายใน 10 กิโลเมตร:\n`;
          rows.forEach((row, index) => {
            dbResponse += `${index + 1}. ${row.name} - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
          });
          socket.emit('botMessage', dbResponse);
        } else {
          socket.emit('botMessage', 'ไม่พบสถานที่ท่องเที่ยวใกล้เคียงในระยะ 10 กิโลเมตร');
        }
      }
    
      // 2. Check if the question is about nearby shops
      else if (question.includes("ร้านค้าใกล้เคียงฉันตอนนี้")) {
        const [rows] = await pool.query(
          `SELECT te.name, te.description, te.id,
           (6371 * acos(cos(radians(?)) * cos(radians(te.latitude)) 
           * cos(radians(te.longitude) - radians(?)) + sin(radians(?)) * sin(radians(te.latitude)))) AS distance
           FROM tourist_entities te
           JOIN categories c ON te.category_id = c.id
           WHERE c.name = 'ร้านค้าของฝาก'
           HAVING distance < 10
           ORDER BY distance LIMIT 10`, 
          [latitude, longitude, latitude]
        );
    
        if (rows.length > 0) {
          dbResponse = `ร้านค้าใกล้พิกัดของคุณภายใน 10 กิโลเมตร:\n`;
          rows.forEach((row, index) => {
            dbResponse += `${index + 1}. ${row.name} - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
          });
          socket.emit('botMessage', dbResponse);
        } else {
          socket.emit('botMessage', 'ไม่พบร้านค้าใกล้เคียงในระยะ 10 กิโลเมตร');
        }
      }
    
      // 3. Check if the question is about nearby hotels
      else if (question.includes("ที่พักใกล้เคียงฉันตอนนี้")) {
        const [rows] = await pool.query(
          `SELECT te.name, te.description, te.id,
           (6371 * acos(cos(radians(?)) * cos(radians(te.latitude)) 
           * cos(radians(te.longitude) - radians(?)) + sin(radians(?)) * sin(radians(te.latitude)))) AS distance
           FROM tourist_entities te
           JOIN categories c ON te.category_id = c.id
           WHERE c.name = 'ที่พัก'
           HAVING distance < 10
           ORDER BY distance LIMIT 10`, 
          [latitude, longitude, latitude]
        );
    
        if (rows.length > 0) {
          dbResponse = `ที่พักใกล้พิกัดของคุณภายใน 10 กิโลเมตร:\n`;
          rows.forEach((row, index) => {
            dbResponse += `${index + 1}. ${row.name} - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
          });
          socket.emit('botMessage', dbResponse);
        } else {
          socket.emit('botMessage', 'ไม่พบที่พักใกล้เคียงในระยะ 10 กิโลเมตร');
        }
      }
    
      // 4. Check if the question is about nearby restaurants
      else if (question.includes("ร้านอาหารใกล้เคียงฉันตอนนี้")) {
        const [rows] = await pool.query(
          `SELECT te.name, te.description, te.id,
           (6371 * acos(cos(radians(?)) * cos(radians(te.latitude)) 
           * cos(radians(te.longitude) - radians(?)) + sin(radians(?)) * sin(radians(te.latitude)))) AS distance
           FROM tourist_entities te
           JOIN categories c ON te.category_id = c.id
           WHERE c.name = 'ร้านอาหาร'
           HAVING distance < 10
           ORDER BY distance LIMIT 10`, 
          [latitude, longitude, latitude]
        );
    
        if (rows.length > 0) {
          dbResponse = `ร้านอาหารใกล้พิกัดของคุณภายใน 10 กิโลเมตร:\n`;
          rows.forEach((row, index) => {
            dbResponse += `${index + 1}. ${row.name} - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
          });
          socket.emit('botMessage', dbResponse);
        } else {
          socket.emit('botMessage', 'ไม่พบร้านอาหารใกล้เคียงในระยะ 10 กิโลเมตร');
        }
      }
    
      // 5. If no category specified, return all nearby places within 10km
      else if (question.includes("สถานที่ใกล้เคียงตอนนี้")) {
        const [rows] = await pool.query(
          `SELECT te.name, te.description, te.id, c.name AS category_name,
           (6371 * acos(cos(radians(?)) * cos(radians(te.latitude)) 
           * cos(radians(te.longitude) - radians(?)) + sin(radians(?)) * sin(radians(te.latitude)))) AS distance
           FROM tourist_entities te
           JOIN categories c ON te.category_id = c.id
           HAVING distance < 10
           ORDER BY distance LIMIT 10`, 
          [latitude, longitude, latitude]
        );
    
        if (rows.length > 0) {
          dbResponse = `สถานที่ใกล้พิกัดของคุณภายใน 10 กิโลเมตร (รวมทุกประเภท):\n`;
          rows.forEach((row, index) => {
            dbResponse += `${index + 1}. ${row.name} (${row.category_name}) - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
          });
          socket.emit('botMessage', dbResponse);
        } else {
          socket.emit('botMessage', 'ไม่พบสถานที่ใกล้เคียงในระยะ 10 กิโลเมตร');
        }
      }
    }

    // 5. Fallback to Google Places API if no relevant data found
    if (!hasRelevantData) {
      const externalPlaces = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: { query: question, key: process.env.GOOGLE_PLACES_API_KEY }
      });

      if (externalPlaces.data.results.length > 0) {
        let externalResponse = 'ข้อมูลจาก Google Places:\n';
        externalPlaces.data.results.forEach((place, index) => {
          externalResponse += `${index + 1}. ${place.name}\n ลิ้งค์ไปยัง Google Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}\n\n`;
        });
        socket.emit('botMessage', externalResponse);
        hasRelevantData = true;
      }

      // 6. Fallback to GPT-4 if no Google Places data found
      if (!hasRelevantData) {
        const gptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: question }],
        }, {
          headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }
        });

        if (gptResponse.data && gptResponse.data.choices) {
          const aiMessage = gptResponse.data.choices[0].message.content;
          socket.emit('botMessage', aiMessage);
        } else {
          socket.emit('botMessage', 'ไม่สามารถตอบคำถามได้ในขณะนี้');
        }
      }
    }

  } catch (error) {
    console.error('Error processing chatbot question:', error);
    socket.emit('botMessage', 'เกิดข้อผิดพลาดในการประมวลผลคำถาม');
  }
};


export default processChatbotQuestion;
