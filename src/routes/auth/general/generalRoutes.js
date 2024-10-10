import express from 'express';
import GeneralController from '../../../controllers/auth/general/GeneralController.js';

const router = express.Router();



router.get('/suggestions', GeneralController.getSuggestions);
router.get('/filters', GeneralController.getAllFilters); // Route to fetch all filters (seasons, districts, categories)

router.get('/search', GeneralController.getTouristEntities); // Unified search route for all criteria

router.get('/places', GeneralController.getAllTouristEntities); // ดึงสถานที่ทุกประเภท
router.get('/tourist-attractions', GeneralController.getAllTouristAttractions); //สถานที่ท่องเที่ยว
router.get('/accommodations', GeneralController.getAllAccommodations); //ที่พัก
router.get('/restaurants', GeneralController.getAllRestaurants); //ร้านอาหาร 
router.get('/souvenir-shops', GeneralController.getAllSouvenirShops); //ร้านค้าของฝาก
router.get('/place/nearby/:id', GeneralController.getNearbyTouristEntitiesHandler); //สถานที่ใกล้เคียง
router.get('/time/:day_of_week/:opening_time/:closing_time', GeneralController.getTouristEntitiesByTime); //ค้นหาสถานที่ตามวันเวลาที่ระบุ

router.get('/seasons/:id/place', GeneralController.getTouristEntitiesBySeason); //ดึงสถานที่ทุกประเภทตามฤดูกาล
router.get('/districts/:id/place', GeneralController.getTouristEntitiesByDistrict); //ดึงสถานที่ทุกประเภทตามอำเภอ
router.get('/categories/:id/place', GeneralController.getTouristEntitiesByCategory); // ดึงสถานที่ทุกประเภทตามหมวดหมู่

router.get('/seasons', GeneralController.getAllSeasons); // ดึงชื่อฤดูกาล
router.get('/districts', GeneralController.getAllDistricts); // ดึงชื่ออำเภอ
router.get('/categories', GeneralController.getAllCategories); // ดึงชื่อประเภทสถานที่

router.get('/tourist-attractions/:district_id', GeneralController.getTouristAttractionsByDistrict); // ดึงสถานที่ท่องเที่ยวเฉพาะในอำเภอที่เลือก
router.get('/accommodations/:district_id', GeneralController.getAccommodationsByDistrict); // ดึงที่พักเฉพาะในอำเภอที่เลือก
router.get('/restaurants/:district_id', GeneralController.getRestaurantsByDistrict); // ดึงร้านอาหารเฉพาะในอำเภอที่เลือก
router.get('/souvenir-shops/:district_id', GeneralController.getSouvenirShopsByDistrict); // ดึงร้านค้าของฝากเฉพาะในอำเภอที่เลือก

// Realtime
router.get('/seasons/real-time', GeneralController.getTouristEntitiesBySeasonRealTime); //เเสดงสถานที่ตามฤดูกาลปัจจุบันเเบบเรียลไทม์
router.get('/places/currently-open', GeneralController.getCurrentlyOpenTouristEntities); //สถานที่ที่เปิดอยู่ตอนนี้ เรียลไทม์
router.get('/places/nearby-by-coordinates', GeneralController.getNearbyPlacesByCoordinates); // สถานที่ใกล้เคียงตามพิกัดปัจจุบันของผู้ใช้

export default router;