import { ref, readonly } from 'vue'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

// Module-level singleton so auth state is shared across all components
const user = ref<User | null>(null)
const accountId = ref<number | null>(null)
const firstName = ref<string>('')

async function loadAccount(authUser: User) {
  let { data: publicUser } = await supabase
    .from('users')
    .select('id, first_name')
    .eq('email', authUser.email!)
    .maybeSingle()

  // Rows missing (e.g. signup failed while RLS was on) — create them now
  if (!publicUser) {
    const fallbackName = authUser.email!.split('@')[0]
    const { data: newUser } = await supabase
      .from('users')
      .insert({ email: authUser.email!, first_name: fallbackName, last_name: '' })
      .select('id, first_name')
      .single()
    if (!newUser) return
    await supabase
      .from('account')
      .insert({ user_id: newUser.id, name: fallbackName, status: 'active' })
    publicUser = newUser
  }

  firstName.value = publicUser.first_name ?? ''

  const { data: account } = await supabase
    .from('account')
    .select('id')
    .eq('user_id', publicUser.id)
    .maybeSingle()
  if (account) accountId.value = account.id
}

supabase.auth.getSession().then(async ({ data }) => {
  user.value = data.session?.user ?? null
  if (data.session?.user) await loadAccount(data.session.user)
})

supabase.auth.onAuthStateChange(async (_event, session) => {
  user.value = session?.user ?? null
  if (session?.user) await loadAccount(session.user)
  else { accountId.value = null; firstName.value = '' }
})

export function useAuth() {
  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    accountId.value = null
    await supabase.auth.signOut()
  }

  return { user: readonly(user), accountId: readonly(accountId), firstName: readonly(firstName), signIn, signUp, signOut }
}
