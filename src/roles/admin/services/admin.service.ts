import api from '../../../services/api.service';
import { UserRole } from '../../../core/config/roles.config';

export interface BackupItem {
  id: string;
  filename: string;
  type: 'mysql' | 'nosql' | 'sqlite';
  size_bytes: number;
  created_at: string;
  status: 'completed' | 'failed' | 'in_progress';
}

export interface AdminUserItem {
  id: number;
  email: string;
  name?: string;
  role: UserRole;
  failed_attempts: number;
  lockout_until: string | null;
  created_at: string;
  is_locked: boolean;
}

export interface HardwareMetrics {
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  uptime_seconds: number;
  active_connections: number;
  mysql_status: 'online' | 'offline';
  mongodb_status: 'online' | 'offline';
  spark_status: 'online' | 'offline';
}

export interface SystemLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  service: 'auth' | 'events' | 'tickets' | 'stats' | 'admin' | 'gateway';
  message: string;
}

export const adminService = {
  // --- DATABASE BACKUPS MODULE ---
  async getBackups(): Promise<BackupItem[]> {
    try {
      return await api.get('/api/database/backups');
    } catch (e) {
      console.warn('Fallback to mock backups list');
      return this.getMockBackups();
    }
  },

  async generateBackup(type: 'mysql' | 'nosql'): Promise<{ id: string; message: string }> {
    return await api.post('/api/database/backup', { type });
  },

  async downloadBackup(id: string): Promise<any> {
    return await api.get(`/api/database/backups/${id}/download`);
  },

  async restoreDatabase(backupId: string): Promise<{ message: string }> {
    return await api.post('/api/database/restore', { backup_id: backupId });
  },

  async optimizeTables(): Promise<{ message: string; tables_optimized: number }> {
    return await api.post('/api/database/optimize');
  },

  async updateAutomaticBackupConfig(config: { enabled: boolean; cron_expression: string }): Promise<any> {
    return await api.put('/api/database/automatic-backup/config', config);
  },

  // --- USER MANAGEMENT MODULE ---
  async getUsers(): Promise<AdminUserItem[]> {
    try {
      return await api.get('/api/auth/admin/users');
    } catch (e) {
      console.warn('Fallback to mock users list');
      return this.getMockUsers();
    }
  },

  async toggleUserBlock(userId: number, block: boolean): Promise<{ message: string }> {
    return await api.patch(`/api/auth/admin/users/${userId}/unlock`, { unlock: !block });
  },

  async forcePasswordChange(userId: number, newPassword?: string): Promise<{ message: string }> {
    return await api.patch(`/api/auth/admin/users/${userId}/password`, { password: newPassword });
  },

  async changeUserRole(userId: number, role: UserRole): Promise<{ message: string }> {
    return await api.put(`/api/users/${userId}/permissions`, { role });
  },

  // --- BROADCAST NOTIFICATION MODULE ---
  async sendBroadcast(subject: string, message: string): Promise<{ message: string; recipients_count: number }> {
    return await api.post('/api/auth/admin/broadcast', { subject, message });
  },

  // --- HARDWARE & SYSTEM MONITORING ---
  async getHardwareMetrics(): Promise<HardwareMetrics> {
    try {
      return await api.get('/api/stats/metrics');
    } catch (e) {
      return this.getMockMetrics();
    }
  },

  async getSystemLogs(service?: string, level?: string): Promise<SystemLog[]> {
    try {
      const params: Record<string, string | number | boolean> = {};
      if (service) params.service = service;
      if (level) params.level = level;
      return await api.get('/api/stats/logs', { params });
    } catch (e) {
      return this.getMockLogs(service, level);
    }
  },

  // --- OFFLINE DEVELOPMENT MOCK DATA ---
  getMockBackups(): BackupItem[] {
    return [
      { id: '1', filename: 'backup_mysql_2026-06-25.sql', type: 'mysql', size_bytes: 45056, created_at: new Date(Date.now() - 24*3600*1000).toISOString(), status: 'completed' },
      { id: '2', filename: 'backup_nosql_2026-06-24.json', type: 'nosql', size_bytes: 154030, created_at: new Date(Date.now() - 48*3600*1000).toISOString(), status: 'completed' },
      { id: '3', filename: 'backup_mysql_2026-06-23.sql', type: 'mysql', size_bytes: 44888, created_at: new Date(Date.now() - 72*3600*1000).toISOString(), status: 'completed' },
      { id: '4', filename: 'backup_nosql_2026-06-22.json', type: 'nosql', size_bytes: 148900, created_at: new Date(Date.now() - 96*3600*1000).toISOString(), status: 'completed' },
      { id: '5', filename: 'backup_mysql_2026-06-21.sql', type: 'mysql', size_bytes: 42000, created_at: new Date(Date.now() - 120*3600*1000).toISOString(), status: 'failed' },
    ];
  },

  getMockUsers(): AdminUserItem[] {
    return [
      { id: 1, email: 'admin@laikaclub.com', name: 'Adán Administrador', role: 'admin', failed_attempts: 0, lockout_until: null, created_at: '2026-01-10T12:00:00Z', is_locked: false },
      { id: 2, email: 'jimena@laikaclub.com', name: 'Jimena Gestor de Eventos', role: 'gestor', failed_attempts: 0, lockout_until: null, created_at: '2026-02-15T14:30:00Z', is_locked: false },
      { id: 3, email: 'carlos.operador@laikaclub.com', name: 'Carlos Operador', role: 'operador', failed_attempts: 2, lockout_until: null, created_at: '2026-03-01T08:15:00Z', is_locked: false },
      { id: 4, email: 'lucia.user@gmail.com', name: 'Lucia User', role: 'usuario', failed_attempts: 0, lockout_until: null, created_at: '2026-04-12T19:40:00Z', is_locked: false },
      { id: 5, email: 'spammer_block@gmail.com', name: 'Troll Accs', role: 'usuario', failed_attempts: 5, lockout_until: new Date(Date.now() + 15*60*1000).toISOString(), created_at: '2026-05-18T11:22:00Z', is_locked: true },
      { id: 6, email: 'juan.perez@live.com', name: 'Juan Perez', role: 'usuario', failed_attempts: 0, lockout_until: null, created_at: '2026-06-01T15:00:00Z', is_locked: false },
    ];
  },

  getMockMetrics(): HardwareMetrics {
    return {
      cpu_percent: 24.5,
      ram_percent: 62.8,
      ram_used_gb: 4.96,
      ram_total_gb: 8.0,
      uptime_seconds: 1245600, // ~14.4 days
      active_connections: 45,
      mysql_status: 'online',
      mongodb_status: 'online',
      spark_status: 'online',
    };
  },

  getMockLogs(service?: string, level?: string): SystemLog[] {
    const allLogs: SystemLog[] = [
      { timestamp: new Date(Date.now() - 5000).toISOString(), level: 'info', service: 'gateway', message: 'Proxying GET /api/stats/metrics to localhost:8004' },
      { timestamp: new Date(Date.now() - 15000).toISOString(), level: 'info', service: 'auth', message: 'User admin@laikaclub.com logged in successfully from mobile app' },
      { timestamp: new Date(Date.now() - 45000).toISOString(), level: 'warning', service: 'tickets', message: 'High load detected in MySQL transaction handler' },
      { timestamp: new Date(Date.now() - 120000).toISOString(), level: 'error', service: 'events', message: 'Connection timeout to primary MySQL server. Switching to local SQLite events.db' },
      { timestamp: new Date(Date.now() - 180000).toISOString(), level: 'info', service: 'stats', message: 'Automatic cleanup executed. Freed 45MB cache' },
      { timestamp: new Date(Date.now() - 300000).toISOString(), level: 'critical', service: 'admin', message: 'Database disk space is at 89% capacity. Backup generation might fail if limit exceeded' },
    ];

    return allLogs.filter(log => {
      if (service && log.service !== service) return false;
      if (level && log.level !== level) return false;
      return true;
    });
  }
};

export default adminService;
