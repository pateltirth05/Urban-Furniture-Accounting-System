const { query, withTransaction } = require("../config/db");
const { nextDocumentNumber } = require("../utils/documentNumber");
const bcrypt = require("bcryptjs");

async function seed() {
  console.log("Seeding 200+ realistic ERP records...");

  await withTransaction(async (client) => {
    // 1. Fixed Admin
    const passHash = await bcrypt.hash("Admin@12345", 10);
    await client.query(
      `INSERT INTO users (name, login_id, email, password_hash, role, is_active)
       VALUES ('System Admin', 'admin', 'admin@urbanfurniture.local', $1, 'ADMIN', TRUE)
       ON CONFLICT (login_id) DO NOTHING`,
      [passHash]
    );

    // 2. Base Chart of Accounts
    const coaList = [
      ['Cash', 'ASSET', 'Current Asset'],
      ['Bank', 'ASSET', 'Current Asset'],
      ['Debtors', 'ASSET', 'Receivable'],
      ['Inventory', 'ASSET', 'Current Asset'],
      ['Creditors', 'LIABILITY', 'Payable'],
      ['Tax Payable', 'LIABILITY', 'Current Liability'],
      ['Capital', 'CAPITAL', 'Owner Equity'],
      ['Sales Income', 'INCOME', 'Operating Income'],
      ['Purchases Expense', 'EXPENSE', 'Cost of Goods Sold'],
      ['Operating Expense', 'EXPENSE', 'Operating Expense']
    ];
    for (const [name, type, sub] of coaList) {
      await client.query(
        `INSERT INTO chart_of_accounts (name, account_type, account_subtype) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
        [name, type, sub]
      );
    }

    // 3. Base Journals
    await client.query(`
      INSERT INTO journals (name, journal_type, default_account_id)
      SELECT 'Sales Journal', 'SALES', id FROM chart_of_accounts WHERE name = 'Sales Income'
      ON CONFLICT (name) DO NOTHING;
      INSERT INTO journals (name, journal_type, default_account_id)
      SELECT 'Purchase Journal', 'PURCHASE', id FROM chart_of_accounts WHERE name = 'Purchases Expense'
      ON CONFLICT (name) DO NOTHING;
      INSERT INTO journals (name, journal_type, default_account_id)
      SELECT 'Bank Journal', 'BANK', id FROM chart_of_accounts WHERE name = 'Bank'
      ON CONFLICT (name) DO NOTHING;
      INSERT INTO journals (name, journal_type, default_account_id)
      SELECT 'Cash Journal', 'CASH', id FROM chart_of_accounts WHERE name = 'Cash'
      ON CONFLICT (name) DO NOTHING;
      INSERT INTO journals (name, journal_type) VALUES ('General Journal', 'GENERAL') ON CONFLICT (name) DO NOTHING;
    `);

    // 4. Product Categories (5 categories)
    const categories = ["Chairs & Benches", "Tables & Desks", "Outdoor Planters", "Trash & Recycling Bins", "Lighting & Bollards"];
    const catIds = [];
    for (const cat of categories) {
      const res = await client.query(
        `INSERT INTO product_categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
        [cat]
      );
      catIds.push(res.rows[0].id);
    }

    // 5. Analytic Accounts (4 accounts)
    const analyticAccs = [
      ["City Infrastructure Project", "EXPENSE"],
      ["Commercial Sales Division", "INCOME"],
      ["Park Beautification", "EXPENSE"],
      ["Residential Wholesale", "INCOME"]
    ];
    const analyticIds = [];
    for (const [aName, aType] of analyticAccs) {
      const res = await client.query(
        `INSERT INTO analytic_accounts (name, type) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type RETURNING id`,
        [aName, aType]
      );
      analyticIds.push(res.rows[0].id);
    }

    // 6. Seed 25 Contacts (Customers, Vendors, Both) + Portal User
    const cities = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune"];
    const contactIds = [];
    const customerIds = [];
    const vendorIds = [];

    for (let i = 1; i <= 25; i++) {
      const cType = i <= 10 ? "CUSTOMER" : i <= 20 ? "VENDOR" : "BOTH";
      const name = cType === "CUSTOMER" ? `Urban Client ${i}` : cType === "VENDOR" ? `Steel & Wood Supplier ${i}` : `Furniture Partner ${i}`;
      const email = `contact${i}@urbanfurniture.test`;
      const city = cities[i % cities.length];

      const cRes = await client.query(
        `INSERT INTO contacts (name, type, email, mobile, street, city, state, pincode)
         VALUES ($1, $2, $3, $4, $5, $6, 'State', '400001')
         ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id, type`,
        [name, cType, email, `98765432${i < 10 ? '0' + i : i}`, `${i} Industrial Estate`, city]
      );
      const cid = cRes.rows[0].id;
      contactIds.push(cid);
      if (cType === "CUSTOMER" || cType === "BOTH") customerIds.push(cid);
      if (cType === "VENDOR" || cType === "BOTH") vendorIds.push(cid);

      // Create portal user for first customer
      if (i === 1) {
        await client.query(
          `INSERT INTO users (name, login_id, email, password_hash, role, contact_id)
           VALUES ('Customer Portal User', 'customer1', 'customer1@urbanfurniture.test', $1, 'CONTACT', $2)
           ON CONFLICT (login_id) DO NOTHING`,
          [passHash, cid]
        );
      }
    }

    // Also Accountant user
    await client.query(
      `INSERT INTO users (name, login_id, email, password_hash, role)
       VALUES ('Head Accountant', 'accountant', 'accountant@urbanfurniture.local', $1, 'ACCOUNTANT')
       ON CONFLICT (login_id) DO NOTHING`,
      [passHash]
    );

    // 7. Seed 25 Products
    const productNames = [
      "Modern Steel Bench", "Ergonomic Park Chair", "Teak Picnic Table", "Concrete Recycled Bin",
      "Solar LED Bollard", "Heavy Duty Street Light", "Granite Outdoor Table", "Cast Iron Bench",
      "Perforated Steel Trash Can", "Tree Guard Enclosure", "Modular Public Seating", "Wooden Patio Bench",
      "Stainless Steel Railing", "Bicycle Parking Rack", "Composite Deck Chair", "Bus Stop Canopy Bench",
      "Planter Box Large", "Self-Watering Planter", "Anti-Vandal Trash Bin", "Smart Solar Lighting Pole",
      "Maintenance Service - Inspection", "Custom Powder Coating", "Site Installation Service",
      "Annual Maintenance Contract", "Urban Design Consultancy"
    ];

    const prodIds = [];
    for (let i = 0; i < productNames.length; i++) {
      const pName = productNames[i];
      const catId = catIds[i % catIds.length];
      const pType = i >= 20 ? "SERVICE" : "GOODS";
      const salesPrice = (i + 1) * 1500;
      const costPrice = salesPrice * 0.6;

      const pRes = await client.query(
        `INSERT INTO products (name, category_id, product_type, sales_price, cost_price)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [pName, catId, pType, salesPrice, costPrice]
      );
      prodIds.push(pRes.rows[0].id);
    }

    // 8. Seed 30 Purchase Orders + Purchase Order Lines + Vendor Bills + Stock IN Movements
    for (let i = 1; i <= 30; i++) {
      const vendorId = vendorIds[i % vendorIds.length];
      const poNum = await nextDocumentNumber(client, "PO");
      const poDate = new Date(2026, 0, (i % 28) + 1);
      const prodId = prodIds[i % 20]; // GOODS products
      const qty = (i % 5) + 5;
      const price = (i + 1) * 900;
      const subtotal = qty * price;
      const tax = subtotal * 0.18;
      const total = subtotal + tax;
      const status = i <= 20 ? "BILLED" : i <= 25 ? "CONFIRMED" : "DRAFT";

      const poRes = await client.query(
        `INSERT INTO purchase_orders (po_number, vendor_id, po_date, payment_terms, status, subtotal, tax_amount, total_amount)
         VALUES ($1, $2, $3, 'Net 30', $4, $5, $6, $7) RETURNING id`,
        [poNum, vendorId, poDate, status, subtotal, tax, total]
      );
      const poId = poRes.rows[0].id;

      await client.query(
        `INSERT INTO purchase_order_lines (purchase_order_id, product_id, analytic_account_id, quantity, unit_price, tax_amount, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [poId, prodId, analyticIds[0], qty, price, tax, total]
      );

      // Create Vendor Bill for BILLED status
      if (status === "BILLED") {
        const billNum = await nextDocumentNumber(client, "B");
        const bStatus = i <= 15 ? "PAID" : "CONFIRMED";
        const amtPaid = bStatus === "PAID" ? total : 0;
        const amtDue = total - amtPaid;

        const billRes = await client.query(
          `INSERT INTO vendor_bills (bill_number, purchase_order_id, vendor_id, bill_reference, bill_date, due_date, status, subtotal, tax_amount, total_amount, amount_paid, amount_due)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
          [billNum, poId, vendorId, `INV-V-${i}`, poDate, new Date(2026, 1, 15), bStatus, subtotal, tax, total, amtPaid, amtDue]
        );
        const billId = billRes.rows[0].id;

        await client.query(
          `INSERT INTO vendor_bill_lines (vendor_bill_id, product_id, analytic_account_id, quantity, unit_price, tax_amount, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [billId, prodId, analyticIds[0], qty, price, tax, total]
        );

        // Stock IN
        await client.query(
          `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, movement_date)
           VALUES ($1, 'IN', $2, 'VENDOR_BILL', $3, $4)`,
          [prodId, qty, billId, poDate]
        );

        // Payment if PAID
        if (bStatus === "PAID") {
          const pmtNum = await nextDocumentNumber(client, "PMT");
          await client.query(
            `INSERT INTO payments (payment_number, payment_type, partner_id, vendor_bill_id, amount, payment_date, payment_method, status)
             VALUES ($1, 'SEND', $2, $3, $4, $5, 'BANK', 'CONFIRMED')`,
            [pmtNum, vendorId, billId, total, poDate]
          );
        }
      }
    }

    // 9. Seed 35 Sales Orders + Lines + Customer Invoices + Payments + Stock OUT Movements
    for (let i = 1; i <= 35; i++) {
      const customerId = customerIds[i % customerIds.length];
      const soNum = await nextDocumentNumber(client, "SO");
      const soDate = new Date(2026, 0, (i % 28) + 1);
      const prodId = prodIds[i % 20]; // GOODS products
      const qty = (i % 3) + 2;
      const price = (i + 1) * 1500;
      const subtotal = qty * price;
      const taxRate = 18;
      const tax = subtotal * 0.18;
      const total = subtotal + tax;
      const status = i <= 25 ? "INVOICED" : i <= 30 ? "CONFIRMED" : "DRAFT";

      const soRes = await client.query(
        `INSERT INTO sales_orders (so_number, customer_id, so_date, payment_terms, status, subtotal, tax_amount, total_amount)
         VALUES ($1, $2, $3, 'Immediate', $4, $5, $6, $7) RETURNING id`,
        [soNum, customerId, soDate, status, subtotal, tax, total]
      );
      const soId = soRes.rows[0].id;

      await client.query(
        `INSERT INTO sales_order_lines (sales_order_id, product_id, analytic_account_id, quantity, unit_price, tax_rate, tax_amount, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [soId, prodId, analyticIds[1], qty, price, taxRate, tax, total]
      );

      // Create Customer Invoice for INVOICED status
      if (status === "INVOICED") {
        const invNum = await nextDocumentNumber(client, "INV");
        const iStatus = i <= 18 ? "PAID" : "CONFIRMED";
        const amtPaid = iStatus === "PAID" ? total : 0;
        const amtDue = total - amtPaid;

        const invRes = await client.query(
          `INSERT INTO customer_invoices (invoice_number, sales_order_id, customer_id, invoice_reference, invoice_date, due_date, status, subtotal, tax_amount, total_amount, amount_paid, amount_due)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
          [invNum, soId, customerId, `PO-CUST-${i}`, soDate, new Date(2026, 1, 28), iStatus, subtotal, tax, total, amtPaid, amtDue]
        );
        const invId = invRes.rows[0].id;

        await client.query(
          `INSERT INTO customer_invoice_lines (invoice_id, product_id, analytic_account_id, quantity, unit_price, tax_rate, tax_amount, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [invId, prodId, analyticIds[1], qty, price, taxRate, tax, total]
        );

        // Stock OUT
        await client.query(
          `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, movement_date)
           VALUES ($1, 'OUT', $2, 'CUSTOMER_INVOICE', $3, $4)`,
          [prodId, qty, invId, soDate]
        );

        // Payment if PAID
        if (iStatus === "PAID") {
          const pmtNum = await nextDocumentNumber(client, "PMT");
          await client.query(
            `INSERT INTO payments (payment_number, payment_type, partner_id, customer_invoice_id, amount, payment_date, payment_method, status)
             VALUES ($1, 'RECEIVE', $2, $3, $4, $5, 'BANK', 'CONFIRMED')`,
            [pmtNum, customerId, invId, total, soDate]
          );
        }
      }
    }

    // 10. Seed Budgets
    const budgetRes = await client.query(
      `INSERT INTO budgets (name, start_date, end_date, responsible_id, status)
       VALUES ('Q1 Urban Beautification Budget', '2026-01-01', '2026-03-31', $1, 'CONFIRMED') RETURNING id`,
      [contactIds[0]]
    );
    const bId = budgetRes.rows[0].id;

    await client.query(
      `INSERT INTO budget_lines (budget_id, analytic_account_id, type, committed_amount) VALUES
       ($1, $2, 'EXPENSE', 250000),
       ($1, $3, 'INCOME', 500000)`,
      [bId, analyticIds[0], analyticIds[1]]
    );

    console.log("Successfully seeded 200+ realistic ERP records!");
  });
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
