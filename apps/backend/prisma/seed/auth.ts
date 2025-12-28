import { AuthError, createClient, User } from '@supabase/supabase-js';

interface SeedUser {
  id: string;
  email: string;
  name: string;
  password: string;
}

interface CreateUserResponse {
  data: { user: User | null };
  error: AuthError | null;
}

interface ListUsersResponse {
  data: { users: User[] };
  error: AuthError | null;
}

interface DeleteUserResponse {
  data: { user: User | null };
  error: AuthError | null;
}

function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables',
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function seedAuthUsers(users: SeedUser[]): Promise<void> {
  const supabase = createSupabaseAdmin();

  console.log(`Creating ${users.length} auth users...`);

  for (const user of users) {
    const response: CreateUserResponse = await supabase.auth.admin.createUser({
      id: user.id,
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { name: user.name },
    });

    if (response.error) {
      if (response.error.message.includes('already been registered')) {
        console.log(`Auth user ${user.email} already exists, skipping...`);
      } else {
        console.error(
          `Failed to create auth user ${user.email}:`,
          response.error.message,
        );

        throw response.error;
      }
    }
  }

  console.log(`Created ${users.length} auth users`);
}

export async function deleteAuthUsers(): Promise<void> {
  const supabase = createSupabaseAdmin();
  const listResponse: ListUsersResponse = await supabase.auth.admin.listUsers();

  if (listResponse.error) {
    console.error('Failed to list auth users:', listResponse.error.message);
    throw listResponse.error;
  }

  const users = listResponse.data.users;

  if (users.length > 0) {
    for (const user of users) {
      const deleteResponse: DeleteUserResponse =
        await supabase.auth.admin.deleteUser(user.id);

      if (deleteResponse.error) {
        console.error(
          `Failed to delete auth user ${user.email}:`,
          deleteResponse.error.message,
        );
      }
    }

    console.log(`Deleted ${users.length} auth users`);
  } else {
    console.log('No auth users to delete');
  }
}
