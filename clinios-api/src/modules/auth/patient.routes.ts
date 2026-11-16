import { Router } from 'express';
import {
  registerPatientSchema,
  loginPatientSchema,
  refreshPatientSchema,
  publicClinicSearchQuery,
} from '@/shared/validation';
import { authRateLimit, validate } from '../../middleware';
import * as controller from './patient.controller';

export const patientAuthRoutes = Router();

// Public, no auth â€” powers the clinic picker on the registration form.
patientAuthRoutes.get(
  '/clinics',
  validate(publicClinicSearchQuery, 'query'),
  controller.searchClinics,
);

patientAuthRoutes.post(
  '/register-patient',
  authRateLimit,
  validate(registerPatientSchema),
  controller.registerPatient,
);

patientAuthRoutes.post(
  '/login-patient',
  authRateLimit,
  validate(loginPatientSchema),
  controller.loginPatient,
);

patientAuthRoutes.post(
  '/refresh-patient',
  validate(refreshPatientSchema),
  controller.refreshPatient,
);
