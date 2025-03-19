import { z } from 'zod';
import { RateLimiter } from './rate-limiter.js';

// Field-level security schema builder
export function createFieldSecuritySchema<T extends z.ZodRawShape>(
  fields: T,
  allowedFields: (keyof T)[]
): z.ZodObject<Pick<T, typeof allowedFields[number]>> {
  const filteredFields = Object.entries(fields).reduce((acc, [key, value]) => {
    if (allowedFields.includes(key as keyof T)) {
      return { ...acc, [key]: value };
    }
    return acc;
  }, {} as Partial<{ [k in keyof T]: T[k] }>);

  return z.object(filteredFields as T);
}

// Security validation function
export function validateSecurity(
  collection: string, 
  operation: 'read' | 'write',
  config: {
    readOnly?: boolean;
    allowedCollections?: string[];
  },
  rateLimiter: RateLimiter
): void {
  // Check if in read-only mode and trying to write
  if (config.readOnly && operation === 'write') {
    throw new Error('Server is in read-only mode. Write operations are not allowed.');
  }
  
  // Check collection access restrictions
  if (config.allowedCollections?.length && 
      !config.allowedCollections.includes(collection)) {
    throw new Error(`Access to collection '${collection}' is not allowed.`);
  }
  
  // Check rate limiting
  if (!rateLimiter.check(`${collection}_${operation}`)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
}

// Example usage of field-level security
export const userFieldSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string(),
  phoneNumber: z.string(),
  photoURL: z.string().url(),
  emailVerified: z.boolean(),
  disabled: z.boolean(),
  customClaims: z.record(z.any()),
  metadata: z.object({
    creationTime: z.string(),
    lastSignInTime: z.string(),
  }),
});

// Create restricted schemas for different roles
export const publicUserFields = createFieldSecuritySchema(
  userFieldSchema.shape,
  ['displayName', 'photoURL']
);

export const adminUserFields = createFieldSecuritySchema(
  userFieldSchema.shape,
  ['email', 'displayName', 'phoneNumber', 'photoURL', 'emailVerified', 'disabled', 'customClaims', 'metadata']
);

// Helper function to validate and filter data based on role
export function validateAndFilterUserData(
  data: any,
  role: 'public' | 'admin'
): z.infer<typeof userFieldSchema> {
  const schema = role === 'admin' ? adminUserFields : publicUserFields;
  return schema.parse(data);
} 