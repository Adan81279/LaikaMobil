export type UserRole = 'admin' | 'gestor' | 'operador' | 'usuario';

export interface RoleConfig {
  id: UserRole;
  level: number;
  name: string;
  description: string;
}

export const ROLES: Record<UserRole, RoleConfig> = {
  admin: {
    id: 'admin',
    level: 4,
    name: 'Administrador',
    description: 'Control total del sistema, administración de base de datos, backups, auditoría general, email masivo y aprobaciones de catálogo.',
  },
  gestor: {
    id: 'gestor',
    level: 3,
    name: 'Gestor de Eventos',
    description: 'Creación y administración de eventos, recintos, diseño matricial de salas y parametrización de mercancía local.',
  },
  operador: {
    id: 'operador',
    level: 2,
    name: 'Operador / Staff',
    description: 'Operaciones en campo (puerta del recinto), validación física de boletos mediante lector de códigos QR y control de incidencias.',
  },
  usuario: {
    id: 'usuario',
    level: 1,
    name: 'Usuario Final',
    description: 'Registro, consulta del catálogo público de eventos, compra interactiva de boletos, acceso a Wallet personal y solicitudes de devoluciones.',
  },
};

/**
 * Checks if a user's role has access to a resource based on hierarchy level.
 */
export function canAccess(userRole: UserRole, minRoleRequired: UserRole): boolean {
  const userRoleConfig = ROLES[userRole];
  const requiredRoleConfig = ROLES[minRoleRequired];
  
  if (!userRoleConfig || !requiredRoleConfig) return false;
  return userRoleConfig.level >= requiredRoleConfig.level;
}

/**
 * Detailed permission matrix module/action helper.
 */
const PERMISSIONS: Record<UserRole, Record<string, string[]>> = {
  admin: {
    database: ['list', 'create', 'download', 'restore', 'optimize', 'configure'],
    users: ['list', 'block', 'password', 'role', 'broadcast'],
    events: ['list', 'create', 'edit', 'publish', 'unpublish', 'venues', 'rooms', 'map'],
    tickets: ['purchase', 'validate', 'incidents', 'refund', 'lucky-seat'],
    stats: ['dashboard', 'manager', 'hardware', 'logs'],
    merchandise: ['create', 'edit', 'approve', 'order'],
    achievements: ['read'],
  },
  gestor: {
    database: ['audit'], // can read audit logs of DB/Access
    users: ['request-permission'],
    events: ['list', 'create', 'edit', 'publish', 'unpublish', 'rooms', 'map'],
    tickets: ['purchase', 'refund', 'lucky-seat'],
    stats: ['manager'],
    merchandise: ['create', 'edit', 'order'],
    achievements: ['read'],
  },
  operador: {
    database: [],
    users: ['request-permission'],
    events: ['list'],
    tickets: ['validate', 'incidents'],
    stats: [],
    merchandise: [],
    achievements: ['read'],
  },
  usuario: {
    database: [],
    users: ['request-permission'],
    events: ['list'],
    tickets: ['purchase', 'refund', 'lucky-seat'],
    stats: [],
    merchandise: ['order'],
    achievements: ['read', 'coupons'],
  },
};

/**
 * Verifies if a user role can perform a specific action within a module.
 */
export function hasPermission(role: UserRole, module: string, action: string): boolean {
  const rolePermissions = PERMISSIONS[role];
  if (!rolePermissions) return false;
  
  const moduleActions = rolePermissions[module];
  if (!moduleActions) return false;
  
  return moduleActions.includes(action);
}
