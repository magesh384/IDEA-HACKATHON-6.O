-- ============================================================
-- AI Business Assistant — MySQL Schema
-- Run: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS ai_business_assistant
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ai_business_assistant;

-- ---------------------------------------------------------
-- USERS & BUSINESSES
-- ---------------------------------------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner', 'manager', 'staff') NOT NULL DEFAULT 'owner',
  business_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE businesses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_user_id INT NOT NULL,
  business_name VARCHAR(190) NOT NULL,
  owner_name VARCHAR(190) NOT NULL,
  gst_number VARCHAR(20) NULL,
  pan_number VARCHAR(15) NULL,
  business_type VARCHAR(100) NULL,
  industry VARCHAR(100) NULL,
  store_category VARCHAR(100) NULL,
  address VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  country VARCHAR(100) DEFAULT 'India',
  pincode VARCHAR(12) NULL,

  -- financial setup
  initial_investment DECIMAL(14,2) DEFAULT 0,
  working_capital DECIMAL(14,2) DEFAULT 0,
  monthly_rent DECIMAL(14,2) DEFAULT 0,
  electricity_cost DECIMAL(14,2) DEFAULT 0,
  internet_cost DECIMAL(14,2) DEFAULT 0,
  other_expenses DECIMAL(14,2) DEFAULT 0,

  -- settings
  gst_registered TINYINT(1) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  financial_year VARCHAR(20) NULL,
  tax_regime ENUM('old', 'new') DEFAULT 'new',
  theme ENUM('light', 'dark') DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',

  onboarding_complete TINYINT(1) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_business_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE users
  ADD CONSTRAINT fk_user_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL;

-- ---------------------------------------------------------
-- EMPLOYEES
-- ---------------------------------------------------------
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(190) NOT NULL,
  position VARCHAR(100) NULL,
  monthly_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  phone VARCHAR(20) NULL,
  email VARCHAR(190) NULL,
  hire_date DATE NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_employee_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE employee_attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  date DATE NOT NULL,
  status ENUM('present', 'absent', 'leave', 'half_day') NOT NULL DEFAULT 'present',
  UNIQUE KEY uniq_emp_date (employee_id, date),
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payroll (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  business_id INT NOT NULL,
  month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  base_salary DECIMAL(12,2) NOT NULL,
  bonus DECIMAL(12,2) DEFAULT 0,
  deductions DECIMAL(12,2) DEFAULT 0,
  net_paid DECIMAL(12,2) NOT NULL,
  paid_on DATE NULL,
  status ENUM('pending', 'paid') DEFAULT 'pending',
  CONSTRAINT fk_payroll_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_payroll_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- SUPPLIERS & CUSTOMERS
-- ---------------------------------------------------------
CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(190) NOT NULL,
  contact_person VARCHAR(190) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(190) NULL,
  avg_delivery_delay_days DECIMAL(5,1) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_supplier_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(190) NOT NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(190) NULL,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  pending_balance DECIMAL(12,2) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- PRODUCTS / INVENTORY
-- ---------------------------------------------------------
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(190) NOT NULL,
  barcode VARCHAR(64) NULL,
  category VARCHAR(100) NULL,
  brand VARCHAR(100) NULL,
  supplier_id INT NULL,
  buying_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  hsn_code VARCHAR(20) NULL,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  cess_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 5,
  expiry_date DATE NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_barcode_business (business_id, barcode),
  CONSTRAINT fk_product_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- HSN -> GST rate lookup table (seedable/extendable reference data)
CREATE TABLE hsn_gst_rates (
  hsn_code VARCHAR(20) PRIMARY KEY,
  description VARCHAR(190) NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  cess_rate DECIMAL(5,2) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- BILLING / INVOICES
-- ---------------------------------------------------------
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  customer_id INT NULL,
  invoice_number VARCHAR(40) NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount DECIMAL(14,2) NOT NULL DEFAULT 0,
  cgst DECIMAL(14,2) NOT NULL DEFAULT 0,
  sgst DECIMAL(14,2) NOT NULL DEFAULT 0,
  igst DECIMAL(14,2) NOT NULL DEFAULT 0,
  cess DECIMAL(14,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  cost_total DECIMAL(14,2) NOT NULL DEFAULT 0, -- sum of buying_price*qty, for profit calc
  payment_method ENUM('cash', 'card', 'upi', 'credit') DEFAULT 'cash',
  payment_status ENUM('paid', 'pending', 'partial') DEFAULT 'paid',
  is_interstate TINYINT(1) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_invoice_number (business_id, invoice_number),
  CONSTRAINT fk_invoice_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(190) NOT NULL, -- snapshot at sale time
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  buying_price DECIMAL(12,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(14,2) NOT NULL,
  CONSTRAINT fk_item_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- EXPENSES
-- ---------------------------------------------------------
CREATE TABLE expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  category ENUM('rent','electricity','internet','salary','loan_emi','depreciation','misc') NOT NULL,
  description VARCHAR(255) NULL,
  amount DECIMAL(14,2) NOT NULL,
  expense_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_expense_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  lender VARCHAR(190) NULL,
  principal DECIMAL(14,2) NOT NULL,
  emi_amount DECIMAL(12,2) NOT NULL,
  emi_due_day INT NOT NULL DEFAULT 1, -- day of month
  outstanding_balance DECIMAL(14,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_loan_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  type VARCHAR(50) NOT NULL, -- e.g. 'low_stock', 'gst_due', 'profit_drop'
  severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
  title VARCHAR(190) NOT NULL,
  message VARCHAR(500) NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- AI CHAT HISTORY
-- ---------------------------------------------------------
CREATE TABLE ai_chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ai_recommendations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'inventory','sales','expense','customer','employee'
  title VARCHAR(190) NOT NULL,
  detail VARCHAR(500) NOT NULL,
  is_dismissed TINYINT(1) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reco_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- AUDIT LOG
-- ---------------------------------------------------------
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NULL,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  details VARCHAR(500) NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- USEFUL INDEXES
-- ---------------------------------------------------------
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_invoices_business_date ON invoices(business_id, created_at);
CREATE INDEX idx_invoice_items_product ON invoice_items(product_id);
CREATE INDEX idx_expenses_business_date ON expenses(business_id, expense_date);
CREATE INDEX idx_notifications_business_read ON notifications(business_id, is_read);
