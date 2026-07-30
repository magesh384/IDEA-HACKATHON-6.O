const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/employeeController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.listEmployees);
router.post('/', ctrl.createEmployee);
router.put('/:id', ctrl.updateEmployee);
router.post('/:id/attendance', ctrl.recordAttendance);
router.post('/:id/payroll', ctrl.runPayroll);

module.exports = router;
