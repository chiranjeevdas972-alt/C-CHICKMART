import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { setDoc, getDoc, collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'poultry-farm-test',
      firestore: {
        rules: readFileSync('DRAFT_firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  const getUnverifiedContext = (uid: string) => testEnv.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: false });
  const getVerifiedContext = (uid: string) => testEnv.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true });
  const getAdminContext = () => testEnv.authenticatedContext('admin-uid', { email: 'chiranjeevdas972@gmail.com', email_verified: true });

  it('1. Identity Spoofing: DENY if user A tries to create batch for user B', async () => {
    const context = getVerifiedContext('userA');
    const db = context.firestore();
    await assertFails(setDoc(doc(db, 'batches/b1'), {
      batchId: 'B1',
      startDate: '2025-01-01',
      initialQuantity: 100,
      status: 'active',
      ownerId: 'userB' // Malicious: setting owner to someone else
    }));
  });

  it('2. Unverified User Write: DENY write if email is not verified', async () => {
    const context = getUnverifiedContext('userA');
    const db = context.firestore();
    await assertFails(setDoc(doc(db, 'batches/b1'), {
      batchId: 'B1',
      startDate: '2025-01-01',
      initialQuantity: 100,
      status: 'active',
      ownerId: 'userA'
    }));
  });

  it('3. ID Poisoning: DENY batch create with invalid ID characters', async () => {
    const context = getVerifiedContext('userA');
    const db = context.firestore();
    await assertFails(setDoc(doc(db, 'batches/!!!invalid!!!'), {
      batchId: 'B1',
      startDate: '2025-01-01',
      initialQuantity: 100,
      status: 'active',
      ownerId: 'userA'
    }));
  });

  it('4. Schema Invariant: DENY if required fields are missing', async () => {
    const context = getVerifiedContext('userA');
    const db = context.firestore();
    await assertFails(setDoc(doc(db, 'batches/b1'), {
      batchId: 'B1',
      // Missing startDate and initialQuantity
      status: 'active',
      ownerId: 'userA'
    }));
  });

  it('5. Role Escalation: DENY user updating their own role', async () => {
    const context = getVerifiedContext('userA');
    const db = context.firestore();
    // Setup existing user
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/userA'), { uid: 'userA', email: 'userA@example.com', role: 'user' });
    });
    
    await assertFails(updateDoc(doc(db, 'users/userA'), {
      role: 'admin' // Malicious: self-promotion
    }));
  });

  it('6. Immutable Field: DENY updating ownerId on batch', async () => {
    const context = getVerifiedContext('userA');
    const db = context.firestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'batches/b1'), { batchId: 'B1', ownerId: 'userA', status: 'active', startDate: '2025-01-01', initialQuantity: 100 });
    });
    
    await assertFails(updateDoc(doc(db, 'batches/b1'), {
      ownerId: 'userB'
    }));
  });

  it('7. Unauthorized List: DENY unauthenticated batch list', async () => {
    const context = testEnv.unauthenticatedContext();
    const db = context.firestore();
    await assertFails(getDocs(collection(db, 'batches')));
  });

  it('8. Cross-User Read: DENY user A reading user B batch', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'batches/bB'), { batchId: 'BB', ownerId: 'userB', status: 'active', startDate: '2025-01-01', initialQuantity: 100 });
    });
    const context = getVerifiedContext('userA');
    const db = context.firestore();
    await assertFails(getDoc(doc(db, 'batches/bB')));
  });

  it('9. Query Trust: DENY list query without ownerId filter', async () => {
    const context = getVerifiedContext('userA');
    const db = context.firestore();
    // Even if I only own 1 batch, I must filter in query
    await assertFails(getDocs(collection(db, 'batches'))); 
  });

  it('10. Invalid Type: DENY if field type is wrong', async () => {
    const context = getVerifiedContext('userA');
    const db = context.firestore();
    await assertFails(setDoc(doc(db, 'batches/b1'), {
      batchId: 123, // Should be string
      startDate: '2025-01-01',
      initialQuantity: 100,
      status: 'active',
      ownerId: 'userA'
    }));
  });

  it('11. Unauthorized Delete: DENY non-admin deleting batch', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'batches/b1'), { batchId: 'B1', ownerId: 'userA', status: 'active', startDate: '2025-01-01', initialQuantity: 100 });
    });
    const context = getVerifiedContext('userA');
    const db = context.firestore();
    await assertFails(deleteDoc(doc(db, 'batches/b1')));
  });

  it('12. Admin Override: ALLOW admin deleting anything', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'batches/b1'), { batchId: 'B1', ownerId: 'userA', status: 'active', startDate: '2025-01-01', initialQuantity: 100 });
    });
    const context = getAdminContext();
    const db = context.firestore();
    await assertSucceeds(deleteDoc(doc(db, 'batches/b1')));
  });
});
