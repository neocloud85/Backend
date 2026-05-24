export const adminMiddleware = (req, res, next) => {
  // Si no hay usuario autenticado
  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  // En tu tabla el campo es "tipo"
  if (req.user.tipo !== "admin") {
    return res.status(403).json({ error: "Acceso denegado: solo administradores" });
  }

  next();
};
