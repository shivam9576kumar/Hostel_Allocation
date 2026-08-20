const { ZodError } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse(req.body);
    req.body = validated;
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Invalid input data.' });
    }
    return res.status(400).json({ error: 'Validation error.' });
  }
};

module.exports = { validate };
