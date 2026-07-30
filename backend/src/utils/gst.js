const { pool } = require('../config/db');

const VALID_GST_RATES = [0, 5, 12, 18, 28];

/**
 * Look up GST rate for a given HSN code from the reference table.
 * Falls back to null if not found — caller should let the user enter it manually.
 */
async function lookupGstByHsn(hsnCode) {
  if (!hsnCode) return null;
  const [rows] = await pool.query(
    'SELECT hsn_code, description, gst_rate, cess_rate FROM hsn_gst_rates WHERE hsn_code = ?',
    [hsnCode]
  );
  return rows[0] || null;
}

/**
 * Split a GST amount into CGST/SGST (intra-state) or IGST (inter-state).
 */
function splitGst(taxableAmount, gstRate, isInterstate) {
  const totalTax = round2((taxableAmount * gstRate) / 100);
  if (isInterstate) {
    return { cgst: 0, sgst: 0, igst: totalTax };
  }
  const half = round2(totalTax / 2);
  return { cgst: half, sgst: totalTax - half, igst: 0 };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

module.exports = { VALID_GST_RATES, lookupGstByHsn, splitGst, round2 };
