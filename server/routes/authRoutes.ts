import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { generateToken, authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, username, password } = req.body;
  const inputIdentifier = String(email || username || '').trim();
  const inputPassword = String(password || '').trim();

  if (!inputIdentifier || !inputPassword) {
    return res.status(400).json({ error: 'Please provide both username/email and password.' });
  }

  // Fetch all registered users
  let allUsers = db.getUsers();

  // If for any reason users collection is empty, reinitialize seed defaults
  if (!allUsers || allUsers.length === 0) {
    const salt = bcrypt.genSaltSync(10);
    const adminUser = {
      id: 'usr_admin_01',
      email: 'admin@tatapower.com',
      name: 'Command Center Lead Administrator',
      role: 'ADMIN' as const,
      passwordHash: bcrypt.hashSync('TataAdmin2026!', salt),
      department: 'Jamshedpur Intelligent Operations Center',
      designation: 'Chief Operational Technologist',
      permissions: [
        'VIEW_DASHBOARD',
        'UPLOAD_DATA',
        'DOWNLOAD_DATA',
        'MANAGE_RULES',
        'ACKNOWLEDGE_ALARMS',
        'RESOLVE_ALARMS',
        'MANAGE_WIDGETS',
        'MANAGE_USERS',
        'SYSTEM_CONFIG',
      ],
      createdAt: new Date().toISOString(),
    };
    await db.addUser(adminUser);
    allUsers = db.getUsers();
  }

  const identLower = inputIdentifier.toLowerCase();

  // Multi-tier user lookup:
  // 1. Direct Email Match
  let user = allUsers.find((u) => u.email.toLowerCase() === identLower);

  // 2. Direct ID Match (e.g. usr_admin_01)
  if (!user) {
    user = allUsers.find((u) => u.id.toLowerCase() === identLower);
  }

  // 3. Direct Name Match
  if (!user) {
    user = allUsers.find((u) => u.name.toLowerCase() === identLower);
  }

  // 4. Email prefix match (e.g. "admin" for "admin@tatapower.com")
  if (!user) {
    user = allUsers.find((u) => u.email.toLowerCase().split('@')[0] === identLower);
  }

  // 5. Common role aliases
  if (!user) {
    if (identLower === 'admin' || identLower === 'administrator' || identLower === 'lead') {
      user = allUsers.find((u) => u.role === 'ADMIN');
    } else if (
      identLower === 'operator' ||
      identLower === 'staff' ||
      identLower === 'engineer' ||
      identLower === 'op'
    ) {
      user = allUsers.find((u) => u.role === 'STAFF');
    } else if (
      identLower === 'viewer' ||
      identLower === 'auditor' ||
      identLower === 'guest' ||
      identLower === 'view'
    ) {
      user = allUsers.find((u) => u.role === 'VIEWER');
    }
  }

  if (!user) {
    return res.status(401).json({
      error: `Account not found for "${inputIdentifier}". Please use admin, operator, or viewer.`,
    });
  }

  // Password validation:
  // 1. Check bcrypt hash
  let isPasswordValid = false;
  if (user.passwordHash) {
    try {
      isPasswordValid = bcrypt.compareSync(inputPassword, user.passwordHash);
    } catch {
      isPasswordValid = false;
    }
  }

  // 2. Check friendly demo fallback passwords based on user role
  if (!isPasswordValid) {
    const adminPasswords = ['tataadmin2026!', 'tatapower2026!', 'admin123', 'admin', 'password'];
    const staffPasswords = ['tatastaff2026!', 'tatapower2026!', 'operator123', 'op123', 'operator', 'password'];
    const viewerPasswords = ['tataviewer2026!', 'tatapower2026!', 'viewer123', 'view123', 'viewer', 'password'];

    const passLower = inputPassword.toLowerCase();

    if (user.role === 'ADMIN' && adminPasswords.includes(passLower)) {
      isPasswordValid = true;
    } else if (user.role === 'STAFF' && staffPasswords.includes(passLower)) {
      isPasswordValid = true;
    } else if (user.role === 'VIEWER' && viewerPasswords.includes(passLower)) {
      isPasswordValid = true;
    }

    // If matched via demo fallback, update the stored hash to match the new password format
    if (isPasswordValid) {
      const newHash = bcrypt.hashSync(inputPassword, 10);
      await db.updateUser(user.id, { passwordHash: newHash });
    }
  }

  if (!isPasswordValid) {
    return res.status(401).json({
      error: 'Invalid password. Hint: You can use admin / admin123, operator / operator123, or viewer / viewer123.',
    });
  }

  // Update last login timestamp
  await db.updateUser(user.id, { lastLogin: new Date().toISOString() });

  const token = generateToken(user);
  const { passwordHash, ...safeUser } = user;

  await db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'USER_LOGIN',
    details: `User logged into Tata Power Operations Command Center with role [${user.role}].`,
    entityType: 'AUTH',
  });

  return res.json({
    token,
    user: safeUser,
  });
});

router.get('/me', optionalAuth, (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { passwordHash, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

router.post('/logout', optionalAuth, async (req: AuthRequest, res) => {
  if (req.user) {
    await db.addActivityLog({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'USER_LOGOUT',
      details: 'User logged out of session.',
      entityType: 'AUTH',
    });
  }
  res.json({ message: 'Logged out successfully' });
});

export default router;
