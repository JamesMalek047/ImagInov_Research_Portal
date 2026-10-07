<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { supabase } from '../lib/supabase'

const router = useRouter()
const { signIn, signUp } = useAuth()

const isSignUp = ref(false)
const email = ref('')
const password = ref('')
const firstName = ref('')
const lastName = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    if (isSignUp.value) {
      const authData = await signUp(email.value, password.value)
      if (!authData?.user) throw new Error('Sign up failed.')

      const { data: publicUser, error: userErr } = await supabase
        .from('users')
        .insert({ email: email.value, first_name: firstName.value, last_name: lastName.value })
        .select('id')
        .single()
      if (userErr) throw userErr

      await supabase
        .from('account')
        .insert({ user_id: publicUser.id, name: `${firstName.value} ${lastName.value}`, status: 'active' })

      if (authData.session) {
        router.push('/')
      } else {
        // Email confirmation is enabled in Supabase — user must confirm before logging in
        error.value = 'Account created! Check your email to confirm, then sign in.'
      }
    } else {
      await signIn(email.value, password.value)
      router.push('/')
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Something went wrong.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">Imaginov</h1>
      <p class="login-subtitle">{{ isSignUp ? 'Create an account' : 'Sign in to continue' }}</p>

      <form class="login-form" @submit.prevent="submit">
        <template v-if="isSignUp">
          <div class="login-field">
            <label class="login-label" for="first-name">First Name</label>
            <input id="first-name" v-model="firstName" class="login-input" type="text" autocomplete="given-name" required />
          </div>
          <div class="login-field">
            <label class="login-label" for="last-name">Last Name</label>
            <input id="last-name" v-model="lastName" class="login-input" type="text" autocomplete="family-name" required />
          </div>
        </template>

        <div class="login-field">
          <label class="login-label" for="email">Email</label>
          <input id="email" v-model="email" class="login-input" type="email" autocomplete="email" required />
        </div>

        <div class="login-field">
          <label class="login-label" for="password">Password</label>
          <input id="password" v-model="password" class="login-input" type="password" autocomplete="current-password" required />
        </div>

        <p v-if="error" class="login-error">{{ error }}</p>

        <button class="login-btn" type="submit" :disabled="loading">
          {{ loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In' }}
        </button>
      </form>

      <button class="login-toggle" @click="isSignUp = !isSignUp; error = ''">
        {{ isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up" }}
      </button>
    </div>
  </div>
</template>
