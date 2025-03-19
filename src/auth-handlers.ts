import { auth } from './utils/firebase-admin.js';

/**
 * List Firebase Authentication users
 */
export async function listUsers(args: { maxResults?: number; pageToken?: string }) {
  const { maxResults = 1000, pageToken } = args;
  
  try {
    const listUsersResult = await auth.listUsers(maxResults);
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          users: listUsersResult.users.map((user: any) => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            phoneNumber: user.phoneNumber,
            photoURL: user.photoURL,
            disabled: user.disabled,
            emailVerified: user.emailVerified,
            metadata: {
              creationTime: user.metadata.creationTime,
              lastSignInTime: user.metadata.lastSignInTime,
            },
            customClaims: user.customClaims,
          })),
          // pageToken: listUsersResult.pageToken,
          count: listUsersResult.users.length,
        }, null, 2) 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error listing users: ${errorMessage}` }],
      isError: true,
    };
  }
}

/**
 * Get a specific user by ID, email, or phone number
 */
export async function getUser(args: { uid?: string; email?: string; phoneNumber?: string }) {
  const { uid, email, phoneNumber } = args;
  
  try {
    let userRecord;
    if (uid) {
      userRecord = await auth.getUser(uid);
    } else if (email) {
      userRecord = await auth.getUserByEmail(email);
    } else if (phoneNumber) {
      userRecord = await auth.getUserByPhoneNumber(phoneNumber);
    } else {
      throw new Error("At least one of uid, email, or phoneNumber must be provided");
    }
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          phoneNumber: userRecord.phoneNumber,
          photoURL: userRecord.photoURL,
          disabled: userRecord.disabled,
          emailVerified: userRecord.emailVerified,
          metadata: {
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
          },
          customClaims: userRecord.customClaims,
          providerData: userRecord.providerData,
        }, null, 2) 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error retrieving user: ${errorMessage}` }],
      isError: true,
    };
  }
}

/**
 * Create a new Firebase Authentication user
 */
export async function createUser(args: { 
  email: string; 
  password?: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  emailVerified?: boolean;
  disabled?: boolean;
}) {
  try {
    const userRecord = await auth.createUser(args);
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          phoneNumber: userRecord.phoneNumber,
          photoURL: userRecord.photoURL,
          disabled: userRecord.disabled,
          emailVerified: userRecord.emailVerified,
          metadata: {
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
          },
        }, null, 2) 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error creating user: ${errorMessage}` }],
      isError: true,
    };
  }
}

/**
 * Update an existing Firebase Authentication user
 */
export async function updateUser(args: { 
  uid: string;
  email?: string;
  password?: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  emailVerified?: boolean;
  disabled?: boolean;
}) {
  const { uid, ...updateData } = args;
  
  try {
    const userRecord = await auth.updateUser(uid, updateData);
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          phoneNumber: userRecord.phoneNumber,
          photoURL: userRecord.photoURL,
          disabled: userRecord.disabled,
          emailVerified: userRecord.emailVerified,
          metadata: {
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
          },
        }, null, 2) 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error updating user: ${errorMessage}` }],
      isError: true,
    };
  }
}

/**
 * Delete a Firebase Authentication user
 */
export async function deleteUser(args: { uid: string }) {
  const { uid } = args;
  
  try {
    await auth.deleteUser(uid);
    
    return {
      content: [{ type: "text", text: `User with ID ${uid} successfully deleted` }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error deleting user: ${errorMessage}` }],
      isError: true,
    };
  }
}

/**
 * Set custom claims for a Firebase Authentication user
 */
export async function setCustomClaims(args: { uid: string; claims: Record<string, any> }) {
  const { uid, claims } = args;
  
  try {
    await auth.setCustomUserClaims(uid, claims);
    
    return {
      content: [{ 
        type: "text", 
        text: `Custom claims for user ${uid} successfully updated: ${JSON.stringify(claims)}` 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error setting custom claims: ${errorMessage}` }],
      isError: true,
    };
  }
}
