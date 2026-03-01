const jwt = require('jsonwebtoken');

function requirePermission(permissionCode) {
  return (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verificar si el usuario tiene el permiso requerido
      if (!decoded.permissions || !decoded.permissions.includes(permissionCode)) {
        return res.status(403).json({ 
          error: 'No tienes permiso para realizar esta acción',
          requiredPermission: permissionCode
        });
      }

      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  };
}

module.exports = { requirePermission };
