const z = require('zod');

const BookingSchema = z.object({
  room_id: z.union([
    z.number().int().positive({ message: 'Room ID must be a positive integer.' }),
    z.string().regex(/^\d+$/, { message: 'Room ID must be numeric.' }).transform(Number)
  ]).optional(),
  student_roll: z.string().min(3).optional(),
});

const SwapSchema = z.object({
  target_room_id: z.union([
    z.number().int().positive(),
    z.string().regex(/^\d+$/).transform(Number)
  ]),
  student_rolls: z.array(z.string()).optional(),
});

const LoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }).max(255),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  mfaCode: z.string().optional(),
});

module.exports = { BookingSchema, SwapSchema, LoginSchema };
