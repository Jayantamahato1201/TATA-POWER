import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { User, UserRole } from '../types/index.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET all users
router.get('/', optionalAuth, (req: AuthRequest, res) => {
  const users = db.getUsers().map(({ passwordHash, ...safe }) => safe);
  res.json(users);
});

// POST Create user
router.post('/', optionalAuth, (req: AuthRequest, res) => {
  const { email, username, name, role, password, department, designation, permissions } = req.body;

  const rawIdent = email || username;
  if (!rawIdent || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required' });
  }

  const userEmail = rawIdent.includes('@') ? rawIdent : `${rawIdent}@tatapower.com`;
  const displayName = name || rawIdent.charAt(0).toUpperCase() + rawIdent.slice(1);
  const userRole: UserRole = (role ? String(role).toUpperCase() : 'STAFF') as UserRole;

  const existing = db.getUserByEmail(userEmail);
  if (existing) {
    return res.status(400).json({ error: `A user account with email "${userEmail}" already exists` });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const defaultPermissions =
    userRole === 'ADMIN'
      ? [
          'VIEW_DASHBOARD',
          'UPLOAD_DATA',
          'DOWNLOAD_DATA',
          'MANAGE_RULES',
          'ACKNOWLEDGE_ALARMS',
          'RESOLVE_ALARMS',
          'MANAGE_WIDGETS',
          'MANAGE_USERS',
          'SYSTEM_CONFIG',
        ]
      : userRole === 'STAFF'
      ? [
          'VIEW_DASHBOARD',
          'UPLOAD_DATA',
          'DOWNLOAD_DATA',
          'VIEW_ALARMS',
          'ACKNOWLEDGE_ALARMS',
          'RESOLVE_ALARMS',
          'VIEW_REPORTS',
        ]
      : ['VIEW_DASHBOARD', 'VIEW_ALARMS', 'DOWNLOAD_DATA', 'VIEW_REPORTS'];

  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    email: userEmail,
    name: displayName,
    role: userRole,
    passwordHash,
    department: department || 'Operations Control',
    designation: designation || (userRole === 'ADMIN' ? 'Administrator' : 'Operations Specialist'),
    permissions: permissions || defaultPermissions,
    createdAt: new Date().toISOString(),
  };

  db.addUser(newUser);

  const actor = req.user || {
    id: 'usr_admin_01',
    name: 'Command Center Administrator',
    email: 'admin@tatapower.com',
  };

  db.addActivityLog({
    userId: actor.id,
    userName: actor.name,
    userEmail: actor.email,
    action: 'USER_CREATED',
    details: `Created new user ${newUser.email} with role [${newUser.role}].`,
    entityType: 'USER',
    entityId: newUser.id,
  });

  const { passwordHash: _, ...safeUser } = newUser;
  res.status(201).json({ user: safeUser });
});

// PUT Update user
router.put('/:id', optionalAuth, (req: AuthRequest, res) => {
  const { name, role, department, designation, permissions, password } = req.body;

  const updates: Partial<User> = {};
  if (name) updates.name = name;
  if (role) updates.role = (String(role).toUpperCase() as UserRole);
  if (department) updates.department = department;
  if (designation) updates.designation = designation;
  if (permissions) updates.permissions = permissions;

  if (password) {
    const salt = bcrypt.genSaltSync(10);
    updates.passwordHash = bcrypt.hashSync(password, salt);
  }

  const updated = db.updateUser(req.params.id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'User not found' });
  }

  const actor = req.user || {
    id: 'usr_admin_01',
    name: 'Command Center Administrator',
    email: 'admin@tatapower.com',
  };

  db.addActivityLog({
    userId: actor.id,
    userName: actor.name,
    userEmail: actor.email,
    action: 'USER_UPDATED',
    details: `Updated user profile [ID: ${req.params.id}].`,
    entityType: 'USER',
    entityId: req.params.id,
  });

  const { passwordHash, ...safe } = updated;
  res.json({ user: safe });
});

// DELETE User
router.delete('/:id', optionalAuth, (req: AuthRequest, res) => {
  if (req.user && req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own active administrator account' });
  }

  const success = db.deleteUser(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'User not found' });
  }

  const actor = req.user || {
    id: 'usr_admin_01',
    name: 'Command Center Administrator',
    email: 'admin@tatapower.com',
  };

  db.addActivityLog({
    userId: actor.id,
    userName: actor.name,
    userEmail: actor.email,
    action: 'USER_DELETED',
    details: `Deleted user account [ID: ${req.params.id}].`,
    entityType: 'USER',
    entityId: req.params.id,
  });

  res.json({ message: 'User deleted successfully' });
});

// GET Activity Logs
router.get('/logs', optionalAuth, (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const logs = db.getActivityLogs(limit);
  res.json(logs);
});

export default router;
