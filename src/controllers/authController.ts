import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { JWT_SECRET } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password: string;
}

function signToken(id: number, email: string): string {
  return jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email and password are required.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters.' });
      return;
    }

    const [existing] = await pool.query<UserRow[]>('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      res.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashed]
    );

    const token = signToken(result.insertId, email);
    res.status(201).json({
      token,
      user: { id: result.insertId, name, email }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const token = signToken(user.id, user.email);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
}
