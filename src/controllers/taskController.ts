import { Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest, TaskRow } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

export async function getTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const [rows] = await pool.query<(TaskRow & RowDataPacket)[]>(
      'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ message: 'Server error fetching tasks.' });
  }
}

export async function getTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const [rows] = await pool.query<(TaskRow & RowDataPacket)[]>(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ message: 'Server error fetching task.' });
  }
}

export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, description, priority, status, due_date } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      res.status(400).json({ message: 'Title is required (min 2 characters).' });
      return;
    }

    const finalPriority = VALID_PRIORITIES.includes(priority) ? priority : 'MEDIUM';
    const finalStatus = VALID_STATUSES.includes(status) ? status : 'PENDING';

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO tasks (user_id, title, description, priority, status, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, title.trim(), description || null, finalPriority, finalStatus, due_date || null]
    );

    const [rows] = await pool.query<(TaskRow & RowDataPacket)[]>(
      'SELECT * FROM tasks WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ message: 'Server error creating task.' });
  }
}

export async function updateTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { title, description, priority, status, due_date } = req.body;

    const [existingRows] = await pool.query<(TaskRow & RowDataPacket)[]>(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existingRows.length === 0) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }

    const existing = existingRows[0];
    const finalTitle = title && title.trim().length >= 2 ? title.trim() : existing.title;
    const finalPriority = VALID_PRIORITIES.includes(priority) ? priority : existing.priority;
    const finalStatus = VALID_STATUSES.includes(status) ? status : existing.status;

    await pool.query(
      `UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, due_date = ?
       WHERE id = ? AND user_id = ?`,
      [
        finalTitle,
        description !== undefined ? description : existing.description,
        finalPriority,
        finalStatus,
        due_date !== undefined ? due_date : existing.due_date,
        id,
        userId
      ]
    );

    const [rows] = await pool.query<(TaskRow & RowDataPacket)[]>('SELECT * FROM tasks WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ message: 'Server error updating task.' });
  }
}

export async function deleteTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ message: 'Server error deleting task.' });
  }
}
