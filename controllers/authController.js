const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { 
      name, email, password, localChurch, 
      gender, birthdate, country, countyOrState, ministryInterest 
    } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = await User.create({ 
      username: name, 
      email, 
      password: hashedPassword,
      localChurch: localChurch || 'Global Member',
      gender: gender || 'prefer_not_to_say',
      birthdate,
      country: country || 'Kenya',
      countyOrState: countyOrState || '',
      ministryInterest: ministryInterest || 'General Fellow'
    });

    res.status(201).json({ token: signToken(user._id), user });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ token: signToken(user._id), user: user.toJSON() });
  } catch (err) { next(err); }
};
