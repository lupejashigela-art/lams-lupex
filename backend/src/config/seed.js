/**
 * Seed OWNER user + sample data for MR_LUPEX99
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  try {
    const username = 'owner';
    const password = 'Lupex2026!';
    const hash = await bcrypt.hash(password, 12);

    const roleRes = await db.query(`SELECT id FROM roles WHERE name = 'OWNER'`);
    if (!roleRes.rows[0]) {
      console.error('OWNER role not found. Run schema.sql first.');
      process.exit(1);
    }
    const roleId = roleRes.rows[0].id;

    const exists = await db.query(`SELECT id FROM users WHERE username = $1`, [username]);
    if (!exists.rows[0]) {
      await db.query(
        `INSERT INTO users (username, password_hash, full_name, role_id)
         VALUES ($1, $2, $3, $4)`,
        [username, hash, 'MR_LUPEX99 Owner', roleId]
      );
      console.log('OWNER user created: owner / Lupex2026!');
    } else {
      console.log('Owner user already exists.');
    }

    // Sample manager
    const mgrRole = await db.query(`SELECT id FROM roles WHERE name = 'MANAGER'`);
    if (mgrRole.rows[0]) {
      const mgrExists = await db.query(`SELECT id FROM users WHERE username = 'manager'`);
      if (!mgrExists.rows[0]) {
        const mHash = await bcrypt.hash('1234', 12);
        await db.query(
          `INSERT INTO users (username, password_hash, full_name, role_id)
           VALUES ('manager', $1, 'Manager', $2)`,
          [mHash, mgrRole.rows[0].id]
        );
        console.log('MANAGER user created: manager / 1234');
      }
    }

    // Sample farmers
    const fCount = await db.query(`SELECT COUNT(*) AS c FROM farmers`);
    if (parseInt(fCount.rows[0].c, 10) === 0) {
      await db.query(`
        INSERT INTO farmers (name, phone, location, notes) VALUES
        ('Juma Mkulima', '0755000001', 'Iringa', 'Mahindi supplier'),
        ('Asha Shamba', '0755000002', 'Mbeya', 'Mpunga supplier'),
        ('Peter Farm', '0755000003', 'Ruvuma', 'Mixed crops')
      `);
      console.log('Sample farmers added.');
    }

    // Sample buyers
    const bCount = await db.query(`SELECT COUNT(*) AS c FROM buyers`);
    if (parseInt(bCount.rows[0].c, 10) === 0) {
      await db.query(`
        INSERT INTO buyers (name, phone, location, credit_limit, risk_level) VALUES
        ('ABC Company', '0788000001', 'Dar es Salaam', 5000000, 'LOW'),
        ('Mama Neema', '0788000002', 'Morogoro', 1000000, 'LOW'),
        ('Boss John', '0788000003', 'Dodoma', 2000000, 'MEDIUM')
      `);
      console.log('Sample buyers added.');
    }

    console.log('========================================');
    console.log('Seed complete.');
    console.log('Login: owner / Lupex2026!');
    console.log('========================================');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
