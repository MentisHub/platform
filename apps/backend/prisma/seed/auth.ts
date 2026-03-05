import { createSupabaseAdmin } from './helpers/supabase.helper';

interface SeedUser {
  id: string;
  email: string;
  name: string;
  password: string;
}

export async function seedAuthUsers(users: SeedUser[]): Promise<void> {
  const supabaseAdmin = createSupabaseAdmin();

  for (const user of users) {
    const createResponse = await supabaseAdmin.auth.admin.createUser({
      id: user.id,
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { name: user.name },
    });

    if (createResponse.error) {
      if (createResponse.error.message.includes('already been registered')) {
        console.log(`  [AUTH]  ${user.email}  (already exists, skipping)`);
        continue;
      } else {
        console.error(
          `  [AUTH:ERROR]  ${user.email}:`,
          createResponse.error.message,
        );
        throw createResponse.error;
      }
    }

    const loginResponse = await supabaseAdmin.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    if (loginResponse.error) {
      console.error(
        `  [AUTH:ERROR]  ${user.email}:`,
        loginResponse.error.message,
      );
    } else if (loginResponse.data.session) {
      const { access_token, refresh_token } = loginResponse.data.session;
      console.log(`  [AUTH]  ${user.email}  →  ${user.id}`);
      console.log(`    access:   ${access_token}`);
      console.log(`    refresh:  ${refresh_token}`);
    }
  }
}

export async function deleteAuthUsers(): Promise<void> {
  const supabase = createSupabaseAdmin();
  const listResponse = await supabase.auth.admin.listUsers();

  if (listResponse.error) {
    console.error(
      '  [AUTH:ERROR]  Failed to list users:',
      listResponse.error.message,
    );
    throw listResponse.error;
  }

  const users = listResponse.data.users;

  if (users.length === 0) return;

  for (const user of users) {
    const deleteResponse = await supabase.auth.admin.deleteUser(user.id);

    if (deleteResponse.error) {
      console.error(
        `  [AUTH:ERROR]  Failed to delete ${user.email}:`,
        deleteResponse.error.message,
      );
    }
  }

  console.log(`  Deleted ${users.length} auth users`);
}
