/**
 * Binti Events — Demo Data Seeder
 * Inserts realistic Kenyan event-planning business data directly into Supabase PostgreSQL.
 * Run with: node scripts/seed-demo-data.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ltinjyvcrgwcvudrnfby.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0LaJxeEG6eXw6gs27HUd3Q__z1Dy-Xo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helpers ──────────────────────────────────────────────
const uuid = () => crypto.randomUUID();
const d = (daysAgo) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  return dt.toISOString().split('T')[0];
};
const future = (daysAhead) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + daysAhead);
  return dt.toISOString().split('T')[0];
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── 1. CLIENTS ───────────────────────────────────────────
const clients = [
  { id: uuid(), name: 'Amani Gardens Resort', email: 'events@amanigardens.co.ke', phone: '+254 722 100 200', company_name: 'Amani Gardens Resort Ltd', tax_number: 'P051987654B', address: 'Mombasa Road, Nairobi', status: 'active', revenue: 1450000 },
  { id: uuid(), name: 'Sarah Wanjiku Ndung\'u', email: 'sarah.wanjiku@gmail.com', phone: '+254 733 456 789', company_name: '', tax_number: '', address: 'Karen, Nairobi', status: 'active', revenue: 820000 },
  { id: uuid(), name: 'Safaricom PLC', email: 'procurement@safaricom.co.ke', phone: '+254 722 000 100', company_name: 'Safaricom PLC', tax_number: 'P000111222C', address: 'Safaricom House, Waiyaki Way, Westlands', status: 'active', revenue: 3200000 },
  { id: uuid(), name: 'Kenya Breweries Ltd', email: 'events@kbl.co.ke', phone: '+254 720 333 444', company_name: 'Kenya Breweries Limited', tax_number: 'P051445566D', address: 'Thika Road, Ruaraka', status: 'active', revenue: 2100000 },
  { id: uuid(), name: 'Grace Otieno', email: 'grace.otieno@outlook.com', phone: '+254 712 888 999', company_name: '', tax_number: '', address: 'Milimani, Kisumu', status: 'active', revenue: 560000 },
  { id: uuid(), name: 'Radisson Blu Nairobi', email: 'banquets@radissonblu.co.ke', phone: '+254 711 222 333', company_name: 'Radisson Blu Hotel & Residence', tax_number: 'P051778899E', address: 'Upperhill, Nairobi', status: 'active', revenue: 1890000 },
  { id: uuid(), name: 'James Mwangi Kariuki', email: 'jmwangi@yahoo.com', phone: '+254 724 555 666', company_name: '', tax_number: '', address: 'Nyeri Town', status: 'active', revenue: 380000 },
  { id: uuid(), name: 'Nation Media Group', email: 'corporate@nationmedia.com', phone: '+254 720 111 222', company_name: 'Nation Media Group PLC', tax_number: 'P000998877F', address: 'Nation Centre, Kimathi Street', status: 'active', revenue: 2750000 },
  { id: uuid(), name: 'Wangari Maathai Foundation', email: 'programs@wangarimaathai.org', phone: '+254 733 777 888', company_name: 'Green Belt Movement', tax_number: 'P051334455G', address: 'Adams Arcade, Ngong Road', status: 'active', revenue: 670000 },
  { id: uuid(), name: 'Equity Bank Foundation', email: 'csr@equitybank.co.ke', phone: '+254 722 999 000', company_name: 'Equity Group Holdings', tax_number: 'P000556677H', address: 'Equity Centre, Hospital Road, Upperhill', status: 'active', revenue: 4100000 },
  { id: uuid(), name: 'Fatuma Hassan Ali', email: 'fatuma.ali@gmail.com', phone: '+254 710 432 567', company_name: '', tax_number: '', address: 'Old Town, Mombasa', status: 'active', revenue: 290000 },
  { id: uuid(), name: 'Mt. Kenya Safari Club', email: 'events@fairmont.com', phone: '+254 720 654 321', company_name: 'Fairmont Hotels Kenya', tax_number: 'P051112233I', address: 'Nanyuki, Laikipia County', status: 'active', revenue: 1650000 },
  { id: uuid(), name: 'Nairobi International School', email: 'admin@nairobischool.edu.ke', phone: '+254 722 876 543', company_name: 'NIS Board of Governors', tax_number: 'P051667788J', address: 'Lavington, Nairobi', status: 'active', revenue: 920000 },
  { id: uuid(), name: 'Peter Odhiambo Oloo', email: 'peteroloo@gmail.com', phone: '+254 714 321 098', company_name: '', tax_number: '', address: 'Kisii Town, Kisii County', status: 'inactive', revenue: 145000 },
  { id: uuid(), name: 'Chandaria Industries', email: 'events@chandaria.com', phone: '+254 720 987 654', company_name: 'Chandaria Industries Ltd', tax_number: 'P000223344K', address: 'Baba Dogo Road, Industrial Area', status: 'active', revenue: 1350000 },
];

// ── 2. PRODUCTS ──────────────────────────────────────────
const products = [
  { id: uuid(), name: 'Premium Hexagonal Tent (10m x 10m)', category: 'Tents & Marquees', description: 'Elegant hexagonal frame tent with white PVC canopy, clear sidewalls optional. Perfect for 80-100 guests.', price: 85000, unit: 'event', status: 'active' },
  { id: uuid(), name: 'Classic A-Frame Tent (6m x 12m)', category: 'Tents & Marquees', description: 'Traditional A-frame tent with reinforced poles. Ideal for garden weddings and outdoor receptions.', price: 45000, unit: 'event', status: 'active' },
  { id: uuid(), name: 'Stretch Tent (15m x 20m)', category: 'Tents & Marquees', description: 'Modern freeform stretch tent with dramatic peaks. Accommodates 200+ guests with open-air feel.', price: 150000, unit: 'event', status: 'active' },
  { id: uuid(), name: 'Pagoda Tent (5m x 5m)', category: 'Tents & Marquees', description: 'Pointed pagoda tent for VIP areas, registration desks, or DJ booths.', price: 25000, unit: 'event', status: 'active' },
  { id: uuid(), name: 'Chiavari Chair (Gold)', category: 'Furniture & Seating', description: 'Elegant gold chiavari chair with ivory cushion. Minimum order: 50 pieces.', price: 350, unit: 'piece', status: 'active' },
  { id: uuid(), name: 'Chiavari Chair (Silver)', category: 'Furniture & Seating', description: 'Silver chiavari chair with white cushion. Premium wedding seating.', price: 350, unit: 'piece', status: 'active' },
  { id: uuid(), name: 'Round Banquet Table (6ft)', category: 'Furniture & Seating', description: 'Standard 6-foot round banquet table seating 8-10 guests. Includes white linen overlay.', price: 2500, unit: 'piece', status: 'active' },
  { id: uuid(), name: 'Cocktail High Table', category: 'Furniture & Seating', description: 'Tall cocktail table with spandex lycra cover. Available in white, black, or gold.', price: 1800, unit: 'piece', status: 'active' },
  { id: uuid(), name: 'VIP Lounge Set (4-seater)', category: 'Furniture & Seating', description: 'White leather VIP lounge set — 1 sofa, 2 armchairs, 1 coffee table. Corporate event essential.', price: 15000, unit: 'set', status: 'active' },
  { id: uuid(), name: 'Red Carpet Runner (20m)', category: 'Decor & Event Hire', description: 'Premium red carpet runner for grand entrances and award ceremonies.', price: 8000, unit: 'piece', status: 'active' },
  { id: uuid(), name: 'Fairy Lights (100m strand)', category: 'Lighting & Effects', description: 'Warm white fairy lights for canopy draping, tree wrapping, or backdrop accents.', price: 5000, unit: 'strand', status: 'active' },
  { id: uuid(), name: 'LED Uplighter Pack (10 units)', category: 'Lighting & Effects', description: 'Battery-powered RGB LED uplighters with wireless DMX control. Transform any venue colour.', price: 20000, unit: 'pack', status: 'active' },
  { id: uuid(), name: 'Professional PA System (Medium)', category: 'Sound & AV', description: 'Complete PA system with 2x tops, 2x subs, mixing desk, 4x wireless mics. Covers 200-person venue.', price: 35000, unit: 'event', status: 'active' },
  { id: uuid(), name: 'Projector & Screen (10ft)', category: 'Sound & AV', description: '5000-lumen projector with 10ft motorized screen for presentations and slideshows.', price: 12000, unit: 'event', status: 'active' },
  { id: uuid(), name: 'Floral Centrepiece (Premium)', category: 'Floral & Decor', description: 'Tall floral centrepiece with roses, hydrangeas, and greenery in a gold vase.', price: 4500, unit: 'piece', status: 'active' },
  { id: uuid(), name: 'Balloon Arch (Standard)', category: 'Floral & Decor', description: 'Organic balloon arch in custom colours with greenery accents. Up to 3m span.', price: 12000, unit: 'piece', status: 'active' },
  { id: uuid(), name: 'Stage Platform (4m x 6m)', category: 'Structures', description: 'Modular raised stage platform with skirting. Height adjustable 0.6m - 1.2m.', price: 40000, unit: 'event', status: 'active' },
  { id: uuid(), name: 'Portable Generator (20kVA)', category: 'Power & Utilities', description: 'Silent diesel generator for outdoor events. Includes fuel for 8-hour runtime.', price: 18000, unit: 'event', status: 'active' },
  { id: uuid(), name: 'Mobile Restroom Unit (VIP)', category: 'Power & Utilities', description: 'Premium portable VIP restroom trailer with handwash station, mirror, and air freshener.', price: 22000, unit: 'unit', status: 'active' },
  { id: uuid(), name: 'Event Coordination (Full Day)', category: 'Services', description: 'On-site event coordinator for setup supervision, vendor management, and timeline execution.', price: 25000, unit: 'day', status: 'active' },
];

// ── 3. Build realistic QUOTES ────────────────────────────
function buildItems(productSubset) {
  return productSubset.map(({ product, qty, discount }) => {
    const baseAmount = qty * product.price;
    const discAmount = baseAmount * ((discount || 0) / 100);
    const afterDisc = baseAmount - discAmount;
    const taxAmount = afterDisc * 0.16;
    return {
      id: 'qi_' + uuid().slice(0, 8),
      description: product.name,
      quantity: qty,
      unitPrice: product.price,
      discount: discount || 0,
      tax: 16,
      amount: Math.round(afterDisc * 100) / 100,
    };
  });
}

function calcTotals(items) {
  let subtotal = 0, discountTotal = 0, taxTotal = 0;
  items.forEach(item => {
    const base = item.quantity * item.unitPrice;
    const disc = base * (item.discount / 100);
    const afterDisc = base - disc;
    const tax = afterDisc * (item.tax / 100);
    subtotal += base;
    discountTotal += disc;
    taxTotal += tax;
  });
  const grandTotal = Math.round(subtotal - discountTotal + taxTotal);
  return { subtotal: Math.round(subtotal), discount_total: Math.round(discountTotal), tax_total: Math.round(taxTotal), grand_total: grandTotal };
}

const quoteData = [
  // Q1 – Sarah Wanjiku's wedding
  { client: 1, items: [{ product: products[2], qty: 1, discount: 0 }, { product: products[4], qty: 200, discount: 5 }, { product: products[6], qty: 20, discount: 0 }, { product: products[10], qty: 4, discount: 0 }, { product: products[14], qty: 20, discount: 10 }, { product: products[19], qty: 1, discount: 0 }], status: 'sent', daysAgo: 12 },
  // Q2 – Safaricom product launch
  { client: 2, items: [{ product: products[2], qty: 1, discount: 0 }, { product: products[8], qty: 4, discount: 0 }, { product: products[11], qty: 2, discount: 0 }, { product: products[12], qty: 1, discount: 0 }, { product: products[13], qty: 2, discount: 0 }, { product: products[16], qty: 1, discount: 0 }, { product: products[17], qty: 1, discount: 0 }], status: 'converted', daysAgo: 45 },
  // Q3 – Kenya Breweries gala dinner
  { client: 3, items: [{ product: products[0], qty: 2, discount: 5 }, { product: products[4], qty: 300, discount: 10 }, { product: products[6], qty: 30, discount: 5 }, { product: products[9], qty: 1, discount: 0 }, { product: products[11], qty: 3, discount: 0 }, { product: products[12], qty: 1, discount: 0 }, { product: products[15], qty: 1, discount: 0 }, { product: products[19], qty: 1, discount: 0 }], status: 'converted', daysAgo: 60 },
  // Q4 – Grace Otieno dowry ceremony
  { client: 4, items: [{ product: products[1], qty: 1, discount: 0 }, { product: products[4], qty: 100, discount: 0 }, { product: products[6], qty: 10, discount: 0 }, { product: products[10], qty: 2, discount: 0 }, { product: products[14], qty: 10, discount: 0 }], status: 'sent', daysAgo: 5 },
  // Q5 – Radisson Blu year-end party
  { client: 5, items: [{ product: products[2], qty: 1, discount: 10 }, { product: products[5], qty: 250, discount: 8 }, { product: products[7], qty: 15, discount: 0 }, { product: products[11], qty: 2, discount: 0 }, { product: products[12], qty: 1, discount: 0 }, { product: products[16], qty: 1, discount: 0 }], status: 'draft', daysAgo: 2 },
  // Q6 – Nation Media awards gala
  { client: 7, items: [{ product: products[0], qty: 1, discount: 0 }, { product: products[4], qty: 150, discount: 5 }, { product: products[6], qty: 15, discount: 0 }, { product: products[9], qty: 1, discount: 0 }, { product: products[11], qty: 2, discount: 0 }, { product: products[12], qty: 1, discount: 0 }, { product: products[13], qty: 1, discount: 0 }, { product: products[16], qty: 1, discount: 0 }], status: 'sent', daysAgo: 8 },
  // Q7 – Wangari Foundation tree planting ceremony
  { client: 8, items: [{ product: products[3], qty: 2, discount: 0 }, { product: products[4], qty: 80, discount: 0 }, { product: products[12], qty: 1, discount: 0 }, { product: products[19], qty: 1, discount: 0 }], status: 'converted', daysAgo: 30 },
  // Q8 – Equity Bank CSR event
  { client: 9, items: [{ product: products[2], qty: 1, discount: 5 }, { product: products[4], qty: 400, discount: 10 }, { product: products[6], qty: 40, discount: 5 }, { product: products[8], qty: 6, discount: 0 }, { product: products[11], qty: 4, discount: 0 }, { product: products[12], qty: 1, discount: 0 }, { product: products[13], qty: 2, discount: 0 }, { product: products[16], qty: 1, discount: 0 }, { product: products[17], qty: 2, discount: 0 }, { product: products[18], qty: 2, discount: 0 }, { product: products[19], qty: 1, discount: 0 }], status: 'converted', daysAgo: 90 },
  // Q9 – Fatuma's Swahili wedding
  { client: 10, items: [{ product: products[1], qty: 2, discount: 0 }, { product: products[4], qty: 150, discount: 5 }, { product: products[6], qty: 15, discount: 0 }, { product: products[10], qty: 3, discount: 0 }, { product: products[14], qty: 15, discount: 0 }, { product: products[15], qty: 1, discount: 0 }], status: 'sent', daysAgo: 15 },
  // Q10 – Mt. Kenya Safari Club retreat
  { client: 11, items: [{ product: products[3], qty: 4, discount: 0 }, { product: products[7], qty: 10, discount: 0 }, { product: products[8], qty: 2, discount: 0 }, { product: products[12], qty: 1, discount: 0 }, { product: products[17], qty: 1, discount: 0 }], status: 'draft', daysAgo: 1 },
  // Q11 – Nairobi School graduation
  { client: 12, items: [{ product: products[1], qty: 1, discount: 0 }, { product: products[4], qty: 500, discount: 15 }, { product: products[6], qty: 50, discount: 10 }, { product: products[12], qty: 1, discount: 0 }, { product: products[16], qty: 1, discount: 0 }], status: 'sent', daysAgo: 20 },
  // Q12 – James Mwangi's ruracio
  { client: 6, items: [{ product: products[1], qty: 1, discount: 0 }, { product: products[4], qty: 80, discount: 0 }, { product: products[6], qty: 8, discount: 0 }, { product: products[10], qty: 2, discount: 0 }], status: 'converted', daysAgo: 40 },
  // Q13 – Chandaria corporate event
  { client: 14, items: [{ product: products[0], qty: 1, discount: 0 }, { product: products[5], qty: 120, discount: 5 }, { product: products[7], qty: 8, discount: 0 }, { product: products[8], qty: 3, discount: 0 }, { product: products[11], qty: 2, discount: 0 }, { product: products[12], qty: 1, discount: 0 }, { product: products[13], qty: 1, discount: 0 }], status: 'sent', daysAgo: 10 },
  // Q14 – Amani Gardens Christmas party
  { client: 0, items: [{ product: products[2], qty: 1, discount: 5 }, { product: products[4], qty: 180, discount: 8 }, { product: products[6], qty: 18, discount: 0 }, { product: products[10], qty: 6, discount: 0 }, { product: products[11], qty: 2, discount: 0 }, { product: products[15], qty: 2, discount: 0 }], status: 'draft', daysAgo: 3 },
];

const quotes = quoteData.map((q, idx) => {
  const items = buildItems(q.items);
  const totals = calcTotals(items);
  return {
    id: uuid(),
    quote_number: `QT-2026-${String(1001 + idx).padStart(4, '0')}`,
    client_id: clients[q.client].id,
    client_name: clients[q.client].name,
    quote_date: d(q.daysAgo),
    valid_until: d(q.daysAgo - 30),
    grand_total: totals.grand_total,
    status: q.status,
    items,
    notes: pick([
      'Event setup begins at 6:00 AM. Client to confirm final guest count 5 days before.',
      'Includes delivery, setup, and breakdown within Nairobi. Overnight rental adds 30%.',
      'VAT inclusive. 50% deposit required to confirm booking. Balance due 3 days before event.',
      'Transport to venue included. Client responsible for security overnight.',
      'Custom colour scheme requested — gold and ivory. Final colour samples approved.',
      'Rain backup plan in place. Indoor venue on standby at additional KES 20,000.',
    ]),
  };
});

// ── 4. Build INVOICES from converted quotes + standalone ──
const invoiceRecords = [];

// Invoices from converted quotes
const convertedQuotes = quotes.filter(q => q.status === 'converted');
convertedQuotes.forEach((q, idx) => {
  const isPaid = idx < 2; // First 2 converted quotes are fully paid
  const isPartial = idx === 2; // Third one partially paid
  const isOverdue = idx === 3; // Fourth one is overdue
  const paidAmount = isPaid ? q.grand_total : (isPartial ? Math.round(q.grand_total * 0.5) : 0);
  
  const payments = [];
  if (isPaid) {
    payments.push({
      id: 'pm_' + uuid().slice(0, 8),
      paymentDate: d(q.quote_date ? 30 : 20),
      paymentMethod: pick(['bank_transfer', 'mobile_transfer']),
      referenceNumber: `MPE${Math.floor(100000 + Math.random() * 900000)}`,
      amountPaid: Math.round(q.grand_total * 0.5),
      notes: 'Deposit — 50% commitment fee',
    }, {
      id: 'pm_' + uuid().slice(0, 8),
      paymentDate: d(5),
      paymentMethod: pick(['bank_transfer', 'mobile_transfer', 'cheque']),
      referenceNumber: `MPE${Math.floor(100000 + Math.random() * 900000)}`,
      amountPaid: q.grand_total - Math.round(q.grand_total * 0.5),
      notes: 'Balance clearance before event',
    });
  } else if (isPartial) {
    payments.push({
      id: 'pm_' + uuid().slice(0, 8),
      paymentDate: d(15),
      paymentMethod: 'mobile_transfer',
      referenceNumber: `MPE${Math.floor(100000 + Math.random() * 900000)}`,
      amountPaid: paidAmount,
      notes: 'Deposit — 50% commitment fee received via M-Pesa',
    });
  }

  invoiceRecords.push({
    id: uuid(),
    invoice_number: `INV-2026-${String(2001 + idx).padStart(4, '0')}`,
    client_id: q.client_id,
    client_name: q.client_name,
    due_date: d(isPaid ? 0 : (isOverdue ? -10 : 7)),
    grand_total: q.grand_total,
    balance_remaining: q.grand_total - paidAmount,
    status: isPaid ? 'paid' : (isPartial ? 'partially_paid' : (isOverdue ? 'overdue' : 'pending')),
    items: q.items,
    notes: `Auto-generated from ${q.quote_number}. Payments: ${JSON.stringify(payments)}`,
  });
});

// Standalone invoices (not from quotes)
const standaloneInvoices = [
  { clientIdx: 0, items: [{ product: products[1], qty: 1, discount: 0 }, { product: products[4], qty: 60, discount: 0 }, { product: products[6], qty: 6, discount: 0 }], status: 'paid', daysAgo: 70 },
  { clientIdx: 5, items: [{ product: products[3], qty: 3, discount: 0 }, { product: products[7], qty: 12, discount: 0 }, { product: products[12], qty: 1, discount: 0 }], status: 'paid', daysAgo: 55 },
  { clientIdx: 7, items: [{ product: products[0], qty: 1, discount: 5 }, { product: products[4], qty: 100, discount: 8 }, { product: products[12], qty: 1, discount: 0 }, { product: products[11], qty: 2, discount: 0 }], status: 'pending', daysAgo: 7 },
  { clientIdx: 9, items: [{ product: products[2], qty: 1, discount: 0 }, { product: products[8], qty: 2, discount: 0 }, { product: products[17], qty: 1, discount: 0 }], status: 'overdue', daysAgo: 35 },
  { clientIdx: 12, items: [{ product: products[1], qty: 1, discount: 0 }, { product: products[4], qty: 250, discount: 12 }, { product: products[6], qty: 25, discount: 5 }, { product: products[19], qty: 1, discount: 0 }], status: 'pending', daysAgo: 4 },
  { clientIdx: 14, items: [{ product: products[0], qty: 1, discount: 0 }, { product: products[4], qty: 100, discount: 0 }, { product: products[6], qty: 10, discount: 0 }, { product: products[8], qty: 2, discount: 0 }, { product: products[12], qty: 1, discount: 0 }], status: 'paid', daysAgo: 50 },
];

standaloneInvoices.forEach((si, idx) => {
  const items = buildItems(si.items);
  const totals = calcTotals(items);
  const isPaid = si.status === 'paid';
  
  const payments = [];
  if (isPaid) {
    payments.push({
      id: 'pm_' + uuid().slice(0, 8),
      paymentDate: d(si.daysAgo - 5),
      paymentMethod: pick(['bank_transfer', 'mobile_transfer', 'cheque']),
      referenceNumber: `MPE${Math.floor(100000 + Math.random() * 900000)}`,
      amountPaid: totals.grand_total,
      notes: 'Full payment received',
    });
  }

  invoiceRecords.push({
    id: uuid(),
    invoice_number: `INV-2026-${String(3001 + idx).padStart(4, '0')}`,
    client_id: clients[si.clientIdx].id,
    client_name: clients[si.clientIdx].name,
    due_date: d(si.daysAgo - 14),
    grand_total: totals.grand_total,
    balance_remaining: isPaid ? 0 : totals.grand_total,
    status: si.status,
    items,
    notes: pick([
      'Direct invoice — no quote reference. Payment terms: NET 14.',
      'Urgent booking. Delivery confirmed for 2 days before event.',
      'Client account in good standing. Previous 3 invoices paid on time.',
    ]),
  });
});

// ── 5. COMPANY SETTINGS ─────────────────────────────────
const companySettingsRecord = {
  company_name: 'Binti Tents & Events',
  tax_number: 'P051234567A',
  address: 'Ngong Road, Nairobi, Kenya',
  bank_details: 'Equity Bank — A/C 1160274628991\nBranch: Ngong Road\nSWIFT: EABORKE',
  currency: 'KES',
  terms_template: '1. 50% commitment fee to book, with the balance paid before setup.\n2. Broken or damaged equipment will be billed at replacement cost.\n3. Setup and breakdown are included within Nairobi County.\n4. Cancellation within 7 days of event date forfeits the deposit.\n5. Client by making payment authorizes Binti Tents & Events to supply the above facilities.',
};

// ── SEED EXECUTION ───────────────────────────────────────
async function insertRows(table, rows, label) {
  let success = 0;
  let failed = 0;
  for (const row of rows) {
    const { error } = await supabase.from(table).insert(row);
    if (error) {
      failed++;
      console.error(`   ❌ ${label} insert error:`, error.message, '| Row:', row.name || row.quote_number || row.invoice_number || row.company_name || 'unknown');
    } else {
      success++;
    }
  }
  console.log(`   ✅ ${label}: ${success} inserted, ${failed} failed`);
  return { success, failed };
}

async function seed() {
  console.log('\n🌱 Binti Events — Database Seeder\n');
  console.log('════════════════════════════════════════');
  
  // 1. Clear existing data (order matters for FK constraints)
  console.log('🧹 Clearing existing data...');
  const tables = ['invoices', 'quotes', 'products', 'clients', 'company_settings'];
  for (const t of tables) {
    const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error && !error.message.includes('column')) {
      // company_settings may not have 'id' column — try alternate delete
      await supabase.from(t).delete().neq('company_name', '__never__');
    }
  }
  console.log('   ✅ Tables cleared\n');

  // 2. Insert Clients
  console.log(`👥 Inserting ${clients.length} clients...`);
  await insertRows('clients', clients, 'Clients');

  // 3. Insert Products
  console.log(`📦 Inserting ${products.length} products...`);
  await insertRows('products', products, 'Products');

  // 4. Insert Quotes
  console.log(`📄 Inserting ${quotes.length} quotes...`);
  await insertRows('quotes', quotes, 'Quotes');

  // 5. Insert Invoices
  console.log(`💰 Inserting ${invoiceRecords.length} invoices...`);
  await insertRows('invoices', invoiceRecords, 'Invoices');

  // 6. Insert Company Settings
  console.log('⚙️  Inserting company settings...');
  const { error: sErr } = await supabase.from('company_settings').insert(companySettingsRecord);
  if (sErr) { console.error('   ❌ Settings error:', sErr.message); } else { console.log('   ✅ Company settings inserted'); }

  // Summary
  console.log('\n════════════════════════════════════════');
  console.log('📊 SEED SUMMARY');
  console.log('────────────────────────────────────────');
  console.log(`   Clients:    ${clients.length}`);
  console.log(`   Products:   ${products.length}`);
  console.log(`   Quotes:     ${quotes.length}`);
  console.log(`   Invoices:   ${invoiceRecords.length}`);
  console.log(`   Paid:       ${invoiceRecords.filter(i => i.status === 'paid').length}`);
  console.log(`   Pending:    ${invoiceRecords.filter(i => i.status === 'pending').length}`);
  console.log(`   Partial:    ${invoiceRecords.filter(i => i.status === 'partially_paid').length}`);
  console.log(`   Overdue:    ${invoiceRecords.filter(i => i.status === 'overdue').length}`);
  console.log('════════════════════════════════════════');
  console.log('✨ Database seeded successfully!\n');
}

seed().catch(err => {
  console.error('💥 Fatal seed error:', err);
  process.exit(1);
});

