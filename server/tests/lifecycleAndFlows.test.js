const request = require('supertest');
const app = require('../index');
const db = require('../database/init');
const bcrypt = require('bcryptjs');

describe('Lifecycle and Flows', () => {
  let token = '';
  const testUsername = 'test_admin_lifecycle';
  const testPassword = 'test_admin_lifecycle_password';

  beforeAll(async () => {
    // Wait for migrations and seeding to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create a temporary test admin user
    const hash = bcrypt.hashSync(testPassword, 10);
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO users (username, password_hash, full_name, is_full, is_active) VALUES (?, ?, ?, 1, 1)`,
        [testUsername, hash, 'Lifecycle Test Admin'],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Login to get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: testUsername, password: testPassword });
    
    if (res.body && res.body.token) {
      token = res.body.token;
    }
  });

  afterAll(async () => {
    // Clean up temporary user
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM users WHERE username = ?`, [testUsername], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  // Test 1: Migration 036 must preserve return_due_date
  it('should preserve return_due_date in withdrawals_view', async () => {
    const info = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(withdrawals_view)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    const hasDueDate = info.some(col => col.name === 'return_due_date');
    expect(hasDueDate).toBe(true);
  });

  // Test 2: getLifecycleReport must calculate age_months / repair_count
  it('should calculate age_months and repair_count in getLifecycleReport', async () => {
    // 0. Insert a mock station
    const stationCode = 'STN-LIFE-' + Math.random().toString(36).substring(7);
    const stationName = 'Mock Lifecycle Station ' + Math.random().toString(36).substring(7);
    const stationId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO stations (code, name, station_type, highway_no, direction, region, province) VALUES (?, ?, 'Type A', '9', 'Inbound', 'Central', 'Bangkok')`,
        [stationCode, stationName],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // 1. Insert a mock inventory item and withdrawn instance
    const invId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO inventory (name, model, description, quantity, min_stock, requires_sn, unit_price, warranty_months) VALUES ('Test Device', 'Model X', 'Desc', 1, 10, 1, 500, 24)`,
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Set installed_at (created_at) to 5 months ago
    const fiveMonthsAgo = new Date();
    fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
    const dateStr = fiveMonthsAgo.toISOString();

    const lifecycleSerial = 'SN-LIFECYCLE-' + Math.random().toString(36).substring(7);
    const instId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO inventory_instances (inventory_id, serial_number, condition, status, station_id, created_at) VALUES (?, ?, 'New', 'Withdrawn', ?, ?)`,
        [invId, lifecycleSerial, stationId, dateStr],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // 2. Insert mock repairs for this instance
    const ticketNo = 'RP-LIFE-' + Math.random().toString(36).substring(7);
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO repairs (ticket_no, reporter, location, station_id, device_name, problem, status, type, instance_id, inventory_id) VALUES (?, 'Reporter', 'Location', ?, 'Test Device', 'Problem 1', 'เสร็จสิ้น', 'repair', ?, ?)`,
        [ticketNo, stationId, instId, invId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 3. Request lifecycle report
    const req = request(app).get('/api/inventory/lifecycle-report');
    if (token) req.set('Authorization', `Bearer ${token}`);
    const res = await req;

    expect(res.statusCode).toEqual(200);
    const item = res.body.find(i => i.instance_id === instId);
    expect(item).toBeDefined();
    expect(item.age_months).toBeGreaterThanOrEqual(4); // allow 4-6 due to boundaries
    expect(item.repair_count).toEqual(1);
    expect(item.warranty_months).toEqual(24);
    expect(item.is_expired_warranty).toBe(false);
  });

  // Test 3 & 4: Create/complete repair/claim must change/restore instance status
  it('should change and restore instance status during repair lifecycle', async () => {
    // 1. Create a new In Stock instance
    const invId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO inventory (name, model, quantity, min_stock, requires_sn) VALUES ('Repair Test Device', 'Model R', 1, 10, 1)`,
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    const repairSerial = 'SN-REPAIR-FLOW-' + Math.random().toString(36).substring(7);
    const instId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO inventory_instances (inventory_id, serial_number, condition, status) VALUES (?, ?, 'New', 'Withdrawn')`,
        [invId, repairSerial],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // 2. Create Repair via API
    const createRes = await request(app)
      .post('/api/repairs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        device_name: 'Repair Test Device',
        problem: 'Faulty screen',
        instance_id: instId,
        inventory_id: invId,
        location: 'Station Alpha'
      });
    expect(createRes.statusCode).toEqual(201);
    const repairId = createRes.body.id;

    // Verify instance status changed to "Under Repair"
    const instStatusAfterCreate = await new Promise((resolve, reject) => {
      db.get(`SELECT status FROM inventory_instances WHERE id = ?`, [instId], (err, row) => {
        if (err) reject(err);
        else resolve(row.status);
      });
    });
    expect(instStatusAfterCreate).toEqual('Under Repair');

    // 3. Complete Repair via API (update status to เสร็จสิ้น)
    const updateRes = await request(app)
      .patch(`/api/repairs/${repairId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'เสร็จสิ้น',
        repair_note: 'Fixed the screen connector'
      });
    expect(updateRes.statusCode).toEqual(200);

    // Verify instance status restored to "Withdrawn"
    const instStatusAfterComplete = await new Promise((resolve, reject) => {
      db.get(`SELECT status FROM inventory_instances WHERE id = ?`, [instId], (err, row) => {
        if (err) reject(err);
        else resolve(row.status);
      });
    });
    expect(instStatusAfterComplete).toEqual('Withdrawn');
  });

  // Test 5: PO status flow Draft -> Pending -> Approved -> Ordered -> Received
  it('should transition purchase order status correctly and receive inventory', async () => {
    // 1. Insert a mock inventory item
    const invId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO inventory (name, model, quantity, min_stock, requires_sn) VALUES ('PO Flow Device', 'Model P', 5, 10, 0)`,
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // 2. Create PO in Draft status
    const createPoRes = await request(app)
      .post('/api/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ordered_by: 'Test Buyer',
        project_name: 'Test Project',
        company_name: 'Vendor X',
        status: 'Draft',
        items: [
          { inventory_id: invId, quantity: 10, unit_price: 150 }
        ]
      });
    expect(createPoRes.statusCode).toEqual(201);
    const poId = createPoRes.body.id;

    // Verify Draft status
    let po = await new Promise((resolve, reject) => {
      db.get(`SELECT status FROM purchase_orders WHERE id = ?`, [poId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    expect(po.status).toEqual('Draft');

    // 3. Transition to Pending
    let updatePoRes = await request(app)
      .patch(`/api/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Pending' });
    expect(updatePoRes.statusCode).toEqual(200);

    po = await new Promise((resolve, reject) => {
      db.get(`SELECT status FROM purchase_orders WHERE id = ?`, [poId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    expect(po.status).toEqual('Pending');

    // 4. Transition to Approved
    updatePoRes = await request(app)
      .patch(`/api/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Approved' });
    expect(updatePoRes.statusCode).toEqual(200);

    po = await new Promise((resolve, reject) => {
      db.get(`SELECT status FROM purchase_orders WHERE id = ?`, [poId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    expect(po.status).toEqual('Approved');

    // 5. Transition to Ordered
    updatePoRes = await request(app)
      .patch(`/api/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Ordered' });
    if (updatePoRes.statusCode !== 200) {
      console.log('TRANSITION TO ORDERED FAILED:', updatePoRes.body);
    }
    expect(updatePoRes.statusCode).toEqual(200);

    po = await new Promise((resolve, reject) => {
      db.get(`SELECT status FROM purchase_orders WHERE id = ?`, [poId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    expect(po.status).toEqual('Ordered');

    // 6. Receive Goods (Receive PO) -> changes status to Received and increases inventory quantity
    const receiveRes = await request(app)
      .post(`/api/purchase-orders/${poId}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { inventory_id: invId, received_quantity: 10 }
        ]
      });
    expect(receiveRes.statusCode).toEqual(200);

    // Verify PO status is Received
    po = await new Promise((resolve, reject) => {
      db.get(`SELECT status FROM purchase_orders WHERE id = ?`, [poId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    expect(po.status).toEqual('Received');

    // Verify inventory quantity increased: 5 + 10 = 15
    const qty = await new Promise((resolve, reject) => {
      db.get(`SELECT quantity FROM inventory WHERE id = ?`, [invId], (err, row) => {
        if (err) reject(err);
        else resolve(row.quantity);
      });
    });
    expect(qty).toEqual(15);
  });
});
