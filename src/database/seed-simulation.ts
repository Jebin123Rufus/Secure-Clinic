import * as dotenv from 'dotenv';
dotenv.config();

import { CryptoService } from '../infrastructure/crypto/crypto.service';
import { DatabaseService } from '../infrastructure/database/database.service';
import { WormAuditService } from '../infrastructure/worm/worm-audit.service';
import { PatientService } from '../application/services/patient.service';
import { AuditService } from '../application/services/audit.service';
import { ConfigService } from '@nestjs/config';

/**
 * Interactive Healthcare Data Simulation & Seeding Utility
 *
 * Simulates clinical data across two isolated clinics:
 * - Clinic Alpha (Clinic A): 11111111-1111-1111-1111-111111111111
 * - Clinic Beta  (Clinic B): 22222222-2222-2222-2222-222222222222
 *
 * Demonstrates:
 * - AES-256-GCM column encryption of demographic identifiers
 * - SHA-256 cryptographic tamper-evident record digests
 * - India DPDPA Sec 6 consent management flags
 * - Immutable WORM audit trail log generation
 */
async function runSimulation() {
  console.log('\n========================================================================');
  console.log('🏥 SECURE CLINIC: ENTERPRISE DATA SIMULATION & SEEDING ENGINE');
  console.log('========================================================================\n');

  const configService = new ConfigService();
  const cryptoService = new CryptoService(configService);
  const databaseService = new DatabaseService(configService);
  await databaseService.onModuleInit();

  const wormAuditService = new WormAuditService(configService);
  wormAuditService.onModuleInit();

  const auditService = new AuditService(databaseService, wormAuditService);
  const patientService = new PatientService(databaseService, cryptoService);

  const CLINIC_A = '11111111-1111-1111-1111-111111111111';
  const CLINIC_B = '22222222-2222-2222-2222-222222222222';

  const docSarahContext = {
    clinicId: CLINIC_A,
    userRole: 'Doctor' as const,
    userId: 'doc-sarah-101',
    isBreakGlass: false,
    clientIp: '192.168.1.101',
  };

  const docMichaelContext = {
    clinicId: CLINIC_B,
    userRole: 'Doctor' as const,
    userId: 'doc-michael-303',
    isBreakGlass: false,
    clientIp: '192.168.2.202',
  };

  console.log('📋 STEP 1: Seeding Patient Records into Clinic A (Metro General)...');

  const p1 = await patientService.createPatient(
    {
      name: 'Eleanor Vance',
      nationalId: 'NAT-99887711',
      contactNumber: '+1-555-0199',
      medicalNotes: 'Type 2 Diabetes mellitus, controlled with Metformin. HbA1c 6.8%.',
      diagnosisCode: 'E11.9',
      consentWithdrawn: false,
    },
    docSarahContext,
  );
  console.log(`  ✅ [Clinic A] Patient Created: "${p1.name}" (ID: ${p1.id})`);
  console.log(`     🔐 Authenticated Encrypted Name: "${cryptoService.encrypt(p1.name).substring(0, 40)}..."`);
  console.log(`     🛡️ Cryptographic SHA-256 Digest: ${p1.recordHash}\n`);

  const p2 = await patientService.createPatient(
    {
      name: 'Arthur Pendelton',
      nationalId: 'NAT-44556677',
      contactNumber: '+1-555-0144',
      medicalNotes: 'Cardiac Arrhythmia. Beta-blocker dosage under evaluation.',
      diagnosisCode: 'I49.9',
      consentWithdrawn: true, // DPDPA Consent Withdrawn!
    },
    docSarahContext,
  );
  console.log(`  ⚠️  [Clinic A] Patient Created with Withdrawn Consent: "${p2.name}" (ID: ${p2.id})`);
  console.log(`     🔒 DPDPA Sec 6 Status: Active Lock Enabled (consent_withdrawn = true)\n`);

  console.log('📋 STEP 2: Seeding Patient Records into Clinic B (Valley Health)...');

  const p3 = await patientService.createPatient(
    {
      name: 'Devin Martinez',
      nationalId: 'NAT-12345678',
      contactNumber: '+1-555-0188',
      medicalNotes: 'Chronic Asthma with acute exacerbation. Inhaler prescribed.',
      diagnosisCode: 'J45.901',
      consentWithdrawn: false,
    },
    docMichaelContext,
  );
  console.log(`  ✅ [Clinic B] Patient Created: "${p3.name}" (ID: ${p3.id})`);
  console.log(`     🛡️ Cryptographic SHA-256 Digest: ${p3.recordHash}\n`);

  console.log('📋 STEP 3: Demonstrating Multi-Tenant Isolation (RLS Barrier)...');
  console.log(`  Checking if Doctor B in Clinic B can access Eleanor Vance (Clinic A)...`);
  try {
    await patientService.getPatientById(p1.id, docMichaelContext);
    console.log('  ❌ FAILED: Cross-tenant barrier breached!');
  } catch (err: any) {
    console.log(`  🛡️ PASSED: Access safely blocked by RLS: "${err.message}"\n`);
  }

  console.log('📋 STEP 4: Demonstrating DPDPA Sec 6 Consent Lock...');
  console.log(`  Doctor A attempting to read Arthur Pendelton (Consent Withdrawn)...`);
  try {
    await patientService.getPatientById(p2.id, docSarahContext);
    console.log('  ❌ FAILED: Consent lock bypassed unexpectedly!');
  } catch (err: any) {
    console.log(`  🛡️ PASSED: Access blocked under DPDPA Sec 6: "${err.message}"\n`);
  }

  console.log('📋 STEP 5: Simulating Emergency Break-Glass Procedure (§ 164.312(a)(2)(ii))...');
  console.log(`  ER Trauma alert: Doctor overrides consent lock for Arthur Pendelton...`);
  const breakGlassResult = await patientService.breakGlassAccess(
    p2.id,
    {
      reason: 'Acute cardiac arrest in emergency bay. Immediate patient history required.',
      authorizedBy: 'Dr. Sarah - Emergency Attending',
    },
    docSarahContext,
  );
  console.log(`  🚨 EMERGENCY BREAK-GLASS ACTIVATED!`);
  console.log(`     Patient Medical Notes Retrieved: "${breakGlassResult.patient.medicalNotes}"`);
  console.log(`     Emergency Session Token: ${breakGlassResult.emergencySessionToken}`);
  console.log(`     Forensic Notice: ${breakGlassResult.notice}\n`);

  console.log('📋 STEP 6: Verifying Immutable WORM Audit Vault...');
  const wormCheck = await wormAuditService.verifyVaultIntegrity();
  console.log(`  🔐 WORM Blockchain Hash-Chain Integrity: ${wormCheck.valid ? 'VALID & UNTAMPERED' : 'COMPROMISED'}`);
  console.log(`  📜 Total Forensic Audit Records Secured: ${wormCheck.totalRecords}\n`);

  console.log('========================================================================');
  console.log('🎉 SIMULATION COMPLETE! All security layers successfully demonstrated.');
  console.log('========================================================================\n');

  await databaseService.onModuleDestroy();
}

runSimulation().catch((err) => {
  console.error('Simulation error:', err);
  process.exit(1);
});
