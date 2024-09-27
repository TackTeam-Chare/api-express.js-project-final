import express from 'express';
import TouristEntityController from '../../controllers/user/PlacesController.js';
import SearchPlaces from '../../controllers/user/SearchPlaces.js';
import SeasonEntityController from '../../controllers/user/SeasonEntityController.js';
import DistrictEntityController from '../../controllers/user/DistrictEntityController.js';
import CategoryEntityController from '../../controllers/user/CategoryEntityController.js';
import ChatbotSuggestionsController from '../../controllers/user/ChatbotSuggestionsController.js'; 
const router = express.Router();



router.get('/suggestions', ChatbotSuggestionsController.getSuggestions);
router.get('/filters', SearchPlaces.getAllFilters); // Route to fetch all filters (seasons, districts, categories)

router.get('/search', SearchPlaces.getTouristEntities); // Unified search route for all criteria

router.get('/places', TouristEntityController.getAllTouristEntities); // ดึงสถานที่ทุกประเภท
router.get('/tourist-attractions', TouristEntityController.getAllTouristAttractions); //สถานที่ท่องเที่ยว
router.get('/accommodations', TouristEntityController.getAllAccommodations); //ที่พัก
router.get('/restaurants', TouristEntityController.getAllRestaurants); //ร้านอาหาร 
router.get('/souvenir-shops', TouristEntityController.getAllSouvenirShops); //ร้านค้าของฝาก
router.get('/place/nearby/:id', TouristEntityController.getNearbyTouristEntitiesHandler); //สถานที่ใกล้เคียง
router.get('/time/:day_of_week/:opening_time/:closing_time', TouristEntityController.getTouristEntitiesByTime); //ค้นหาสถานที่ตามวันเวลาที่ระบุ

router.get('/seasons/:id/place', TouristEntityController.getTouristEntitiesBySeason); //ดึงสถานที่ทุกประเภทตามฤดูกาล
router.get('/districts/:id/place', TouristEntityController.getTouristEntitiesByDistrict); //ดึงสถานที่ทุกประเภทตามอำเภอ
router.get('/categories/:id/place', TouristEntityController.getTouristEntitiesByCategory); // ดึงสถานที่ทุกประเภทตามหมวดหมู่

router.get('/seasons', SeasonEntityController.getAllSeasons); // ดึงชื่อฤดูกาล
router.get('/districts', DistrictEntityController.getAllDistricts); // ดึงชื่ออำเภอ
router.get('/categories', CategoryEntityController.getAllCategories); // ดึงชื่อประเภทสถานที่

router.get('/tourist-attractions/:district_id', TouristEntityController.getTouristAttractionsByDistrict); // ดึงสถานที่ท่องเที่ยวเฉพาะในอำเภอที่เลือก
router.get('/accommodations/:district_id', TouristEntityController.getAccommodationsByDistrict); // ดึงที่พักเฉพาะในอำเภอที่เลือก
router.get('/restaurants/:district_id', TouristEntityController.getRestaurantsByDistrict); // ดึงร้านอาหารเฉพาะในอำเภอที่เลือก
router.get('/souvenir-shops/:district_id', TouristEntityController.getSouvenirShopsByDistrict); // ดึงร้านค้าของฝากเฉพาะในอำเภอที่เลือก

// Realtime
router.get('/seasons/real-time', TouristEntityController.getTouristEntitiesBySeasonRealTime); //เเสดงสถานที่ตามฤดูกาลปัจจุบันเเบบเรียลไทม์
router.get('/places/currently-open', TouristEntityController.getCurrentlyOpenTouristEntities); //สถานที่ที่เปิดอยู่ตอนนี้ เรียลไทม์
router.get('/places/nearby-by-coordinates', TouristEntityController.getNearbyPlacesByCoordinates); // สถานที่ใกล้เคียงตามพิกัดปัจจุบันของผู้ใช้

export default router;