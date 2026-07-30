const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

const listEmployees = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM employees WHERE business_id = ? AND is_active = 1 ORDER BY name ASC',
    [req.user.businessId]
  );
  res.json({ success: true, employees: rows });
});

const createEmployee = asyncHandler(async (req, res) => {
  const { name, position, monthlySalary, phone, email, hireDate } = req.body;
  if (!name) throw new AppError('Employee name is required', 400);

  const [result] = await pool.query(
    'INSERT INTO employees (business_id, name, position, monthly_salary, phone, email, hire_date) VALUES (?,?,?,?,?,?,?)',
    [req.user.businessId, name, position || null, monthlySalary || 0, phone || null, email || null, hireDate || null]
  );
  res.status(201).json({ success: true, employeeId: result.insertId });
});

const updateEmployee = asyncHandler(async (req, res) => {
  const fieldMap = { monthlySalary: 'monthly_salary', hireDate: 'hire_date', isActive: 'is_active' };
  const allowed = ['name', 'position', 'monthly_salary', 'phone', 'email', 'hire_date', 'is_active'];
  const updates = [];
  const values = [];
  for (const [key, value] of Object.entries(req.body)) {
    const col = fieldMap[key] || key;
    if (allowed.includes(col)) {
      updates.push(`${col} = ?`);
      values.push(value);
    }
  }
  if (updates.length === 0) throw new AppError('No valid fields to update', 400);
  values.push(req.params.id, req.user.businessId);
  await pool.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = ? AND business_id = ?`, values);
  res.json({ success: true });
});

const recordAttendance = asyncHandler(async (req, res) => {
  const { date, status } = req.body;
  await pool.query(
    `INSERT INTO employee_attendance (employee_id, date, status) VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE status = VALUES(status)`,
    [req.params.id, date, status]
  );
  res.json({ success: true });
});

const runPayroll = asyncHandler(async (req, res) => {
  const { month, bonus = 0, deductions = 0 } = req.body; // month = 'YYYY-MM'
  const [[employee]] = await pool.query('SELECT monthly_salary FROM employees WHERE id = ? AND business_id = ?', [
    req.params.id, req.user.businessId,
  ]);
  if (!employee) throw new AppError('Employee not found', 404);

  const netPaid = Number(employee.monthly_salary) + Number(bonus) - Number(deductions);
  await pool.query(
    `INSERT INTO payroll (employee_id, business_id, month, base_salary, bonus, deductions, net_paid, paid_on, status)
     VALUES (?,?,?,?,?,?,?,CURDATE(),'paid')`,
    [req.params.id, req.user.businessId, month, employee.monthly_salary, bonus, deductions, netPaid]
  );

  // Salary paid is also an operating expense
  await pool.query(
    `INSERT INTO expenses (business_id, category, description, amount, expense_date) VALUES (?, 'salary', ?, ?, CURDATE())`,
    [req.user.businessId, `Payroll ${month}`, netPaid]
  );

  res.json({ success: true, netPaid });
});

module.exports = { listEmployees, createEmployee, updateEmployee, recordAttendance, runPayroll };
