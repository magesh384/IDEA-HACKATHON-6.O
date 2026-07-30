const exportBusinessReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "AI Business Assistant";
  workbook.company = "AI Business Assistant";

  // Worksheets
  const dashboardSheet = workbook.addWorksheet("Dashboard");
  const profitSheet = workbook.addWorksheet("Profit & Loss");
  const gstSheet = workbook.addWorksheet("GST Report");
  const invoiceSheet = workbook.addWorksheet("Invoices");
  const expenseSheet = workbook.addWorksheet("Expenses");

  // ==========================
  // PROFIT & LOSS SHEET
  // ==========================

  profitSheet.mergeCells("A1:F1");
  profitSheet.getCell("A1").value = "AI BUSINESS ASSISTANT";

  profitSheet.mergeCells("A2:F2");
  profitSheet.getCell("A2").value = "PROFIT & LOSS STATEMENT";

  profitSheet.getCell("A4").value = "From";
  profitSheet.getCell("B4").value = from || "Beginning";

  profitSheet.getCell("D4").value = "To";
  profitSheet.getCell("E4").value = to || "Today";

  const pl = await computeProfitAndLoss(req.user.businessId, {
    fromDate: from,
    toDate: to,
  });

  profitSheet.getCell("A6").value = "INCOME";
  profitSheet.getCell("A6").font = { bold: true };

  profitSheet.getCell("A7").value = "Sales Revenue";
  profitSheet.getCell("B7").value = pl.revenue;

  profitSheet.getCell("A8").value = "Other Income";
  profitSheet.getCell("B8").value = 0;

  profitSheet.getCell("A9").value = "Total Income";
  profitSheet.getCell("B9").value = pl.revenue;

  profitSheet.getCell("A11").value = "Cost of Goods";
  profitSheet.getCell("B11").value = pl.costOfGoods;

  profitSheet.getCell("A13").value = "Gross Profit";
  profitSheet.getCell("B13").value = pl.grossProfit;

  profitSheet.getCell("A15").value = "Employee Salary";
  profitSheet.getCell("B15").value = pl.employeeSalaries;

  profitSheet.getCell("A16").value = "Loan EMI";
  profitSheet.getCell("B16").value = pl.loanEmi;

  let row = 18;

  Object.entries(pl.expensesByCategory).forEach(([category, amount]) => {
    profitSheet.getCell(`A${row}`).value = category;
    profitSheet.getCell(`B${row}`).value = amount;
    row++;
  });

  profitSheet.getCell(`A${row + 1}`).value = "Net Business Profit";
  profitSheet.getCell(`B${row + 1}`).value = pl.netBusinessProfit;

  profitSheet.getCell("A1").font = {
    bold: true,
    size: 20,
  };

  profitSheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  profitSheet.getCell("A2").font = {
    bold: true,
    size: 16,
  };

  profitSheet.getCell("A2").alignment = {
    horizontal: "center",
  };

  profitSheet.getCell("A6").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "D9EAD3" },
  };

  // ==========================
  // DASHBOARD SHEET
  // ==========================

  dashboardSheet.getCell("A1").value = "BUSINESS DASHBOARD";
  dashboardSheet.getCell("A1").font = {
    bold: true,
    size: 20,
  };

  dashboardSheet.getCell("A3").value = "Revenue";
  dashboardSheet.getCell("B3").value = pl.revenue;

  dashboardSheet.getCell("A4").value = "Expenses";
  dashboardSheet.getCell("B4").value =
    pl.employeeSalaries + pl.loanEmi;

  dashboardSheet.getCell("A5").value = "Gross Profit";
  dashboardSheet.getCell("B5").value = pl.grossProfit;

  dashboardSheet.getCell("A6").value = "Net Profit";
  dashboardSheet.getCell("B6").value = pl.netBusinessProfit;

  // ==========================
  // GST SHEET
  // ==========================

  gstSheet.getCell("A1").value = "GST REPORT";

  // ==========================
  // INVOICE SHEET
  // ==========================

  invoiceSheet.getCell("A1").value = "INVOICE REGISTER";

  // ==========================
  // EXPENSE SHEET
  // ==========================

  expenseSheet.getCell("A1").value = "EXPENSE REGISTER";

  // Download Excel
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=Business_Report.xlsx"
  );

  await workbook.xlsx.write(res);

  res.end();
});