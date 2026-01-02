import { z } from 'zod';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  replaceOrganizationSchema,
  organizationResponseSchema,
  listOrganizationsQuerySchema,
} from './organization.schema';
import { PaginatedResponse } from '../common/pagination.dto';

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type ReplaceOrganizationInput = z.infer<typeof replaceOrganizationSchema>;
export type OrganizationResponse = z.infer<typeof organizationResponseSchema>;
export type ListOrganizationsQuery = z.infer<typeof listOrganizationsQuerySchema>;

export type PaginatedOrganizationsResponse = PaginatedResponse<OrganizationResponse>;
