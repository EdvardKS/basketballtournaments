// Privacy helper: non-authenticated visitors only see the first name.
// Usuarios logueados ven el nombre completo. Admins, capitanes y
// jugadores no se ocultan entre sí (es una liga, se conocen).

export const firstName = (full: string): string => {
  const parts = full.trim().split(/\s+/);
  return parts[0] ?? full;
};

export const displayName = (full: string, authenticated: boolean): string =>
  authenticated ? full : firstName(full);
