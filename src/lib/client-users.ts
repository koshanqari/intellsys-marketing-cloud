import bcrypt from 'bcryptjs';
import { query, queryOne } from './db';
import type { ClientUser, ClientUserPermissions } from './types';

export async function createClientUser(data: {
  client_id: string;
  email: string;
  password: string;
  name?: string;
  role?: string;
  permissions?: ClientUserPermissions;
}): Promise<ClientUser> {
  const passwordHash = await bcrypt.hash(data.password, 10);
  
  const result = await queryOne<ClientUser>(`
    INSERT INTO app.client_users (client_id, email, password_hash, name, role, permissions)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, client_id, email, name, role, permissions, is_active, last_login, created_at, updated_at
  `, [
    data.client_id,
    data.email,
    passwordHash,
    data.name || null,
    data.role || 'viewer',
    JSON.stringify(data.permissions || { analytics: true, templates: false, settings: false }),
  ]);
  
  if (!result) throw new Error('Failed to create user');
  return result;
}

export async function getClientUsers(clientId: string): Promise<ClientUser[]> {
  return query<ClientUser>(`
    SELECT id, client_id, email, name, role, permissions, is_active, last_login, created_at, updated_at
    FROM app.client_users
    WHERE client_id = $1
    ORDER BY created_at DESC
  `, [clientId]);
}

export async function getClientUserById(userId: string): Promise<ClientUser | null> {
  return queryOne<ClientUser>(`
    SELECT id, client_id, email, name, role, permissions, is_active, last_login, created_at, updated_at
    FROM app.client_users
    WHERE id = $1
  `, [userId]);
}

export async function getClientUserByEmail(email: string): Promise<(ClientUser & { password_hash: string }) | null> {
  return queryOne<ClientUser & { password_hash: string }>(`
    SELECT id, client_id, email, password_hash, name, role, permissions, is_active, last_login, created_at, updated_at
    FROM app.client_users
    WHERE email = $1 AND is_active = true
  `, [email]);
}

export async function updateClientUser(userId: string, data: {
  email?: string;
  name?: string;
  role?: string;
  permissions?: ClientUserPermissions;
  is_active?: boolean;
}): Promise<ClientUser> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    values.push(data.email);
  }
  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name || null);
  }
  if (data.role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    values.push(data.role);
  }
  if (data.permissions !== undefined) {
    updates.push(`permissions = $${paramIndex++}`);
    values.push(JSON.stringify(data.permissions));
  }
  if (data.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(data.is_active);
  }

  if (updates.length === 0) {
    const existingUser = await getClientUserById(userId);
    if (!existingUser) throw new Error('User not found');
    return existingUser;
  }

  values.push(userId);

  const result = await queryOne<ClientUser>(`
    UPDATE app.client_users
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, client_id, email, name, role, permissions, is_active, last_login, created_at, updated_at
  `, values);

  if (!result) throw new Error('Failed to update user');
  return result;
}

export async function updateClientUserPassword(userId: string, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 10);
  await query(`UPDATE app.client_users SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);
}

export async function deleteClientUser(userId: string): Promise<void> {
  await query(`DELETE FROM app.client_users WHERE id = $1`, [userId]);
}

export async function validateClientUserPassword(email: string, password: string): Promise<ClientUser | null> {
  const user = await getClientUserByEmail(email);
  if (!user) return null;
  
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return null;
  
  // Update last login
  await query(`UPDATE app.client_users SET last_login = NOW() WHERE id = $1`, [user.id]);
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

