import { AuditEntity, DatabaseAction, EntityType } from 'src/entities/audit.entity';

export const IAuditRepository = 'IAuditRepository';

export interface AuditSearch {
  action?: DatabaseAction;
  entityType?: EntityType;
  ownerId?: string;
}

export interface IAuditRepository {
  getAfter(since: Date, options: AuditSearch): Promise<AuditEntity[]>;
  removeBefore(before: Date): Promise<void>;
}
