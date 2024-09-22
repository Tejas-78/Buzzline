import jwt from "jsonwebtoken";

export default async function jwtAuth(req, res, next) {
    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token == null) {
      return res.status(401).json({ message: 'Token missing' });
    }
  
    jwt.verify(token, process.env.JWT_SECRETKEY, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Token invalid' });
      }
      req.user = user; // Attach user to the request object
      next();
    });
}
