import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    console.log('Login attempt:', email);
    
    let user: any = null;
    let role = '';

    // 1. Check dosen table
    const [dosens]: any = await db.query('SELECT * FROM dosen WHERE email = ?', [email]);
    if (dosens.length > 0) {
      user = dosens[0];
      role = 'dosen';
      console.log('Found in dosen table');
    }

    // 2. Check mahasiswa table
    if (!user) {
      const [mahasiswas]: any = await db.query('SELECT * FROM mahasiswa WHERE email = ?', [email]);
      if (mahasiswas.length > 0) {
        user = mahasiswas[0];
        role = 'mahasiswa';
        console.log('Found in mahasiswa table');
      }
    }

    // 3. Check users table (admin)
    if (!user) {
      const [users]: any = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (users.length > 0) {
        user = users[0];
        role = user.role || 'admin';
        console.log('Found in users table');
      }
    }

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('User data:', { email: user.email, role: role, hasPassword: !!user.password });

    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValid);
    
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Get ID based on role
    let userId = '';
    if (role === 'dosen') {
      userId = user.nidn;
    } else if (role === 'mahasiswa') {
      userId = user.nim;
    } else {
      userId = user.reference_id || user.id;
    }

    // Generate token
    const token = jwt.sign(
      { id: userId, role: role, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: { 
        id: userId, 
        name: user.name || user.email, 
        role: role, 
        email: user.email,
        reference_id: userId 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const registerUser = async (req: Request, res: Response) => {
  // For admin to create users
  const { email, password, role, reference_id } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (email, password, role, reference_id) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, role, reference_id]
    );
    res.status(201).json({ message: 'User created' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};