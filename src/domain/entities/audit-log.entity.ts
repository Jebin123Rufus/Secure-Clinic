export interface AuditLogProperties {
  id?: string;
  clinicId: string;
  userId: string;
  userRole: string;
  action: string;
  resourceId?: string | null;
  clientIp: string;
  statusCode: number;
  isBreakGlass: boolean;
  breakGlassReason?: string | null;
  wormArchiveHash: string;
  details?: Record<string, any> | null;
  timestamp?: Date;
}

export class AuditLogEntity {
  constructor(public readonly props: AuditLogProperties) {}

  static fromRow(row: any): AuditLogEntity {
    return new AuditLogEntity({
      id: row.id,
      clinicId: row.clinic_id,
      userId: row.user_id,
      userRole: row.user_role,
      action: row.action,
      resourceId: row.resource_id,
      clientIp: row.client_ip,
      statusCode: row.status_code,
      isBreakGlass: row.is_break_glass,
      breakGlassReason: row.break_glass_reason,
      wormArchiveHash: row.worm_archive_hash,
      details: row.details,
      timestamp: new Date(row.timestamp),
    });
  }
}
