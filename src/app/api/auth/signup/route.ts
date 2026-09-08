import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { email, password, fullName, organizationName } = await request.json()

  if (!email || !password || !fullName || !organizationName) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Unable to create account.' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const { data: organization, error: organizationError } = await admin
    .from('organizations')
    .insert({ name: organizationName, created_by: authData.user.id })
    .select('id')
    .single()

  if (organizationError || !organization) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: organizationError?.message ?? 'Unable to create organization.' }, { status: 500 })
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: authData.user.id,
    org_id: organization.id,
    role: 'admin',
    full_name: fullName,
  })

  if (profileError) {
    await admin.from('organizations').delete().eq('id', organization.id)
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ needsEmailConfirmation: !authData.session })
}
