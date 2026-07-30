-- ============================================================
-- Seed data for local development / demo
-- Run AFTER schema.sql
-- Demo login: owner@demo-store.com / Passw0rd!
-- (password_hash below corresponds to bcrypt hash of 'Passw0rd!')
-- ============================================================
USE ai_business_assistant;

-- Common HSN -> GST reference rows
INSERT INTO hsn_gst_rates (hsn_code, description, gst_rate, cess_rate) VALUES
('1006', 'Rice', 5.00, 0),
('1701', 'Sugar', 5.00, 0),
('2106', 'Packaged food / namkeen', 12.00, 0),
('3004', 'Medicines', 12.00, 0),
('3304', 'Cosmetics', 18.00, 0),
('6109', 'T-shirts / garments', 12.00, 0),
('8471', 'Computers / laptops', 18.00, 0),
('8517', 'Mobile phones', 18.00, 0),
('2402', 'Cigarettes', 28.00, 5.00),
('2202', 'Aerated drinks', 28.00, 12.00);

-- Demo user (owner) — password: Passw0rd!
INSERT INTO users (id, email, password_hash, role, is_active)
VALUES (1, 'owner@demo-store.com', '$2b$10$DUr56e4/da.uIXJz8Vujx.7XTcBANUJL..bAVeno8lupkwX0zptV2', 'owner', 1);

-- Demo business
INSERT INTO businesses (
  id, owner_user_id, business_name, owner_name, gst_number, pan_number,
  business_type, industry, store_category, address, city, state, country, pincode,
  initial_investment, working_capital, monthly_rent, electricity_cost, internet_cost, other_expenses,
  gst_registered, currency, financial_year, tax_regime, onboarding_complete
) VALUES (
  1, 1, 'Sri Lakshmi General Store', 'Ravi Kumar', '33ABCDE1234F1Z5', 'ABCDE1234F',
  'Retail', 'Grocery & FMCG', 'Kirana Store', '12 Market Street', 'Sriperumbudur', 'Tamil Nadu', 'India', '602105',
  500000, 150000, 18000, 4500, 1200, 2000,
  1, 'INR', '2026-2027', 'new', 1
);

UPDATE users SET business_id = 1 WHERE id = 1;

-- Employees
INSERT INTO employees (business_id, name, position, monthly_salary, phone, hire_date) VALUES
(1, 'Anitha S', 'Cashier', 15000, '9840012345', '2025-01-15'),
(1, 'Suresh M', 'Store Assistant', 13000, '9840012346', '2025-03-01'),
(1, 'Kavya R', 'Inventory Manager', 18000, '9840012347', '2024-11-10');

-- Suppliers
INSERT INTO suppliers (business_id, name, contact_person, phone, avg_delivery_delay_days) VALUES
(1, 'ABC Wholesale Distributors', 'Mohan', '9843000111', 1.5),
(1, 'Metro FMCG Supplies', 'Lakshmi', '9843000222', 4.0),
(1, 'Fresh Farms Co-op', 'Ganesh', '9843000333', 0.5);

-- Customers
INSERT INTO customers (business_id, name, phone, credit_limit, pending_balance) VALUES
(1, 'Walk-in Customer', NULL, 0, 0),
(1, 'Priya Traders', '9876543210', 20000, 4500),
(1, 'Karthik Stores', '9876543211', 10000, 0);

-- Products
INSERT INTO products (business_id, name, barcode, category, brand, supplier_id, buying_price, selling_price, hsn_code, gst_rate, quantity, reorder_level) VALUES
(1, 'Basmati Rice 5kg', '8901000001', 'Grocery', 'India Gate', 1, 420.00, 480.00, '1006', 5.00, 40, 10),
(1, 'Sugar 1kg', '8901000002', 'Grocery', 'Local', 1, 42.00, 48.00, '1701', 5.00, 60, 15),
(1, 'Namkeen Mix 200g', '8901000003', 'Snacks', 'Haldiram', 2, 45.00, 60.00, '2106', 12.00, 8, 10),
(1, 'Cold Cream 100ml', '8901000004', 'Cosmetics', 'Ponds', 2, 85.00, 120.00, '3304', 18.00, 25, 5),
(1, 'Cotton T-Shirt', '8901000005', 'Apparel', 'GenericWear', 2, 220.00, 350.00, '6109', 12.00, 15, 5),
(1, 'Soft Drink 750ml', '8901000006', 'Beverages', 'CoolFizz', 3, 28.00, 40.00, '2202', 28.00, 3, 12);

-- Sample invoices (last 30 days, simplified single-item invoices for demo)
INSERT INTO invoices (business_id, customer_id, invoice_number, subtotal, discount, cgst, sgst, igst, cess, grand_total, cost_total, payment_method, payment_status, created_at) VALUES
(1, 1, 'INV-1001', 480.00, 0, 12.00, 12.00, 0, 0, 504.00, 420.00, 'cash', 'paid', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(1, 2, 'INV-1002', 350.00, 20, 19.80, 19.80, 0, 0, 369.60, 220.00, 'upi', 'paid', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(1, 1, 'INV-1003', 120.00, 0, 10.80, 10.80, 0, 0, 141.60, 85.00, 'cash', 'paid', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(1, 3, 'INV-1004', 96.00, 0, 2.40, 2.40, 0, 0, 100.80, 84.00, 'card', 'paid', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(1, 1, 'INV-1005', 60.00, 0, 3.60, 3.60, 0, 0, 67.20, 45.00, 'cash', 'paid', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, 2, 'INV-1006', 40.00, 0, 5.60, 5.60, 0, 0, 51.20, 28.00, 'upi', 'pending', DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, buying_price, gst_rate, line_total) VALUES
(1, 1, 'Basmati Rice 5kg', 1, 480.00, 420.00, 5.00, 480.00),
(2, 5, 'Cotton T-Shirt', 1, 350.00, 220.00, 12.00, 350.00),
(3, 4, 'Cold Cream 100ml', 1, 120.00, 85.00, 18.00, 120.00),
(4, 2, 'Sugar 1kg', 2, 48.00, 42.00, 5.00, 96.00),
(5, 3, 'Namkeen Mix 200g', 1, 60.00, 45.00, 12.00, 60.00),
(6, 6, 'Soft Drink 750ml', 1, 40.00, 28.00, 28.00, 40.00);

-- Expenses
INSERT INTO expenses (business_id, category, description, amount, expense_date) VALUES
(1, 'rent', 'Monthly shop rent', 18000, DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
(1, 'electricity', 'EB bill', 4500, DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
(1, 'internet', 'Broadband', 1200, DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
(1, 'misc', 'Packaging materials', 2000, DATE_SUB(CURDATE(), INTERVAL 3 DAY));

-- Loan
INSERT INTO loans (business_id, lender, principal, emi_amount, emi_due_day, outstanding_balance) VALUES
(1, 'Local Business Bank', 300000, 8500, 5, 210000);

-- Notifications
INSERT INTO notifications (business_id, type, severity, title, message) VALUES
(1, 'low_stock', 'warning', 'Low stock: Soft Drink 750ml', 'Only 3 units left, below reorder level of 12.'),
(1, 'gst_filing', 'info', 'GSTR-3B due soon', 'Your monthly GST return is due on the 20th.'),
(1, 'loan_emi', 'warning', 'EMI due in 5 days', 'Local Business Bank EMI of ₹8,500 is due on the 5th.');

-- Sample AI recommendations
INSERT INTO ai_recommendations (business_id, category, title, detail) VALUES
(1, 'inventory', 'Reorder Soft Drink 750ml', 'Stock will run out in an estimated 4 days at current sales pace. Recommend ordering 100 units.'),
(1, 'sales', 'Run a weekend offer', 'Snacks category sales dipped 12% this week compared to last. A small bundle discount may help.');
