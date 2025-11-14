# Testing Standards

## Unit Testing Guidelines

### Test Structure

Use the AAA pattern (Arrange, Act, Assert):

```javascript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        role: 'patient'
      };

      // Act
      const user = await userService.createUser(userData);

      // Assert
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });
  });
});
```

### Test Coverage Requirements

For each function, write tests covering:

1. **Happy Path**: Normal, expected usage
2. **Edge Cases**: Boundary conditions, empty inputs, maximum values
3. **Error Cases**: Invalid inputs, missing required fields
4. **Type Safety**: Wrong types, null, undefined
5. **Business Rules**: Domain-specific validation

### Example: Comprehensive Test Suite

```javascript
const { createPrescription } = require('../services/prescriptionService');

describe('createPrescription', () => {
  /**
   * Test 1: Happy Path
   * Scenario: Valid prescription data with all required fields
   * Expected: Prescription created successfully with correct data
   */
  it('should create prescription with valid data', async () => {
    const prescriptionData = {
      patientId: '507f1f77bcf86cd799439011',
      doctorId: '507f1f77bcf86cd799439012',
      medications: [
        {
          name: 'Sertraline',
          dosage: '50mg',
          frequency: 'Once daily',
          quantity: 30
        }
      ],
      duration: 30,
      instructions: 'Take with food'
    };

    const prescription = await createPrescription(prescriptionData);

    expect(prescription).toBeDefined();
    expect(prescription.patientId.toString()).toBe(prescriptionData.patientId);
    expect(prescription.medications).toHaveLength(1);
    expect(prescription.status).toBe('active');
  });

  /**
   * Test 2: Edge Case - Empty Medications Array
   * Scenario: Prescription with no medications
   * Expected: Should throw validation error
   */
  it('should reject prescription with empty medications array', async () => {
    const prescriptionData = {
      patientId: '507f1f77bcf86cd799439011',
      doctorId: '507f1f77bcf86cd799439012',
      medications: [],
      duration: 30
    };

    await expect(createPrescription(prescriptionData))
      .rejects
      .toThrow('At least one medication is required');
  });

  /**
   * Test 3: Edge Case - Maximum Duration
   * Scenario: Prescription with very long duration (365 days)
   * Expected: Should create successfully but may trigger warning
   */
  it('should handle maximum duration prescription', async () => {
    const prescriptionData = {
      patientId: '507f1f77bcf86cd799439011',
      doctorId: '507f1f77bcf86cd799439012',
      medications: [
        {
          name: 'Maintenance Med',
          dosage: '10mg',
          frequency: 'Daily',
          quantity: 365
        }
      ],
      duration: 365
    };

    const prescription = await createPrescription(prescriptionData);

    expect(prescription.duration).toBe(365);
    expect(prescription.status).toBe('active');
  });

  /**
   * Test 4: Invalid Input - Missing Required Fields
   * Scenario: Missing patientId (required field)
   * Expected: Should throw validation error with specific message
   */
  it('should reject prescription without patientId', async () => {
    const prescriptionData = {
      doctorId: '507f1f77bcf86cd799439012',
      medications: [
        {
          name: 'Sertraline',
          dosage: '50mg',
          frequency: 'Once daily',
          quantity: 30
        }
      ],
      duration: 30
    };

    await expect(createPrescription(prescriptionData))
      .rejects
      .toThrow('patientId is required');
  });

  /**
   * Test 5: Type Safety - Invalid Data Types
   * Scenario: Duration as string instead of number
   * Expected: Should throw type validation error or coerce to number
   */
  it('should handle invalid duration type', async () => {
    const prescriptionData = {
      patientId: '507f1f77bcf86cd799439011',
      doctorId: '507f1f77bcf86cd799439012',
      medications: [
        {
          name: 'Sertraline',
          dosage: '50mg',
          frequency: 'Once daily',
          quantity: 30
        }
      ],
      duration: 'thirty' // Invalid type
    };

    await expect(createPrescription(prescriptionData))
      .rejects
      .toThrow(/duration must be a number/i);
  });

  /**
   * Test 6: Edge Case - Negative Duration
   * Scenario: Duration with negative value
   * Expected: Should throw validation error
   */
  it('should reject negative duration', async () => {
    const prescriptionData = {
      patientId: '507f1f77bcf86cd799439011',
      doctorId: '507f1f77bcf86cd799439012',
      medications: [
        {
          name: 'Sertraline',
          dosage: '50mg',
          frequency: 'Once daily',
          quantity: 30
        }
      ],
      duration: -5
    };

    await expect(createPrescription(prescriptionData))
      .rejects
      .toThrow('duration must be positive');
  });

  /**
   * Test 7: Edge Case - Zero Duration
   * Scenario: Duration set to zero
   * Expected: Should throw validation error
   */
  it('should reject zero duration', async () => {
    const prescriptionData = {
      patientId: '507f1f77bcf86cd799439011',
      doctorId: '507f1f77bcf86cd799439012',
      medications: [
        {
          name: 'Sertraline',
          dosage: '50mg',
          frequency: 'Once daily',
          quantity: 30
        }
      ],
      duration: 0
    };

    await expect(createPrescription(prescriptionData))
      .rejects
      .toThrow('duration must be greater than 0');
  });
});
```

## Testing Best Practices

### Test Naming Convention
```javascript
// Pattern: should [expected behavior] when [condition]
it('should return 401 when token is missing', () => {});
it('should create user when all fields are valid', () => {});
it('should throw error when email is duplicate', () => {});
```

### Mock External Dependencies
```javascript
// Mock database calls
jest.mock('../models/User');
User.findOne = jest.fn();

// Mock external APIs
jest.mock('axios');
axios.get = jest.fn().mockResolvedValue({ data: mockData });
```

### Test Data Factories
```javascript
// Create reusable test data
const createMockUser = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  name: 'Test User',
  email: 'test@example.com',
  role: 'patient',
  ...overrides
});

const createMockPrescription = (overrides = {}) => ({
  patientId: '507f1f77bcf86cd799439011',
  doctorId: '507f1f77bcf86cd799439012',
  medications: [
    {
      name: 'Test Med',
      dosage: '10mg',
      frequency: 'Daily',
      quantity: 30
    }
  ],
  duration: 30,
  status: 'active',
  ...overrides
});
```

### Integration Tests
```javascript
// Test full request/response cycle
describe('POST /api/prescriptions', () => {
  it('should create prescription and return 201', async () => {
    const response = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${validToken}`)
      .send(prescriptionData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('_id');
  });
});
```

## Test Organization

```
tests/
├── unit/              # Unit tests for individual functions
│   ├── services/
│   ├── models/
│   └── utils/
├── integration/       # API endpoint tests
│   └── routes/
├── fixtures/          # Test data
│   └── mockData.js
└── helpers/           # Test utilities
    └── testHelpers.js
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- prescriptionService.test.js

# Run in watch mode
npm test -- --watch
```

## Coverage Goals

- **Statements**: 80% minimum
- **Branches**: 75% minimum
- **Functions**: 80% minimum
- **Lines**: 80% minimum

Focus on testing:
- Business logic (services)
- Validation functions
- Authentication/authorization
- Error handling
- Edge cases and boundary conditions
