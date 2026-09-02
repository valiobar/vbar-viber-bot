/**
 * Database seeding utility
 *
 * Seeds initial data into the database if it doesn't exist.
 * Currently seeds an admin user if no users exist.
 */

import { connectToDatabase } from "./mongodb";
import { UserRepository } from "@/domains/user/UserRepository";
import { User } from "@/domains/user/User";
import { hashPassword } from "@/lib/auth/password";
import { UserModel } from "@/domains/user/UserModel";

/**
 * Seed admin user if no users exist
 *
 * Creates a default admin user with:
 * - Username: admin
 * - Password: admin2525
 * - Role: admin
 * - Email: admin@example.com
 * - Name: Admin User
 *
 * This function is idempotent - it only creates the user if no users exist.
 */
export async function seedAdminUser(): Promise<void> {
  try {
    console.log("Starting database seeding...");

    // Ensure database connection
    await connectToDatabase();
    console.log("Database connection established");

    // UserModel is already imported at the top, which ensures the schema is registered with Mongoose
    console.log("UserModel registered");

    const userRepository = new UserRepository();

    // Check if any users exist
    const existingUser = await userRepository.findByUsername("admin");
    if (existingUser) {
      // Admin user already exists, skip seeding
      return;
    }

    // Check if any users exist at all
    const userCount = await UserModel.countDocuments().exec();
    console.log(`Found ${userCount} existing users in database`);

    if (userCount > 0) {
      // Users exist but admin doesn't, that's fine - skip seeding
      console.log("Users already exist, skipping seed");
      return;
    }

    // No users exist, create admin user
    const passwordHash = await hashPassword("admin2525");
    const now = new Date().toISOString();

    // Create user entity with temporary ID (will be replaced by MongoDB _id when saved)
    const adminUser = new User({
      id: "temp", // Temporary ID, will be replaced by repository
      username: "admin",
      email: "admin@example.com",
      passwordHash,
      name: "Admin User",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    // Repository will create the document and return entity with proper ID
    const createdUser = await userRepository.create(adminUser);
    console.log(`Created admin user with ID: ${createdUser.id}`);

    // Verify the user was created by checking the collection
    const finalCount = await UserModel.countDocuments().exec();
    console.log(`Database now contains ${finalCount} user(s)`);

    console.log("✅ Seeded admin user (username: admin, password: admin2525)");
  } catch (error) {
    // Log error but don't throw - seeding should not break the application
    console.error("Failed to seed admin user:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack:", error.stack);
    }
  }
}
