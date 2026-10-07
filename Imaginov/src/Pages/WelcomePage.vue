
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MissionStatement from '../Windows/MissionStatement.vue'
import AppSidebar from '../Components/AppSidebar.vue'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { signOut, firstName } = useAuth()
const isDark = ref(false)
const showMission  = ref(false)
const showSidebar  = ref(false)

function onMenuClick() { showSidebar.value = true }
function onMissionClick() { showMission.value = true }
function onThemeToggle() { isDark.value = !isDark.value }
function onAddClick() {}
function onCardClick(section: string) {
  if (section === 'Thoughts')    router.push('/thoughts')
  if (section === 'Connectors')  router.push('/connectors')
  if (section === 'Research')    router.push('/research')
}
async function onSignOut() {
  await signOut()
  router.push('/login')
}
</script>


<template>
  <div class="app" :class="{ dark: isDark }">
    <!-- Top Navigation -->
    <nav class="navbar">
      <div class="nav-left">
        <button class="nav-btn hamburger" @click="onMenuClick" aria-label="Open menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="nav-center">
        <button class="nav-btn mission-btn" @click="onMissionClick">Mission Statement</button>
        <button class="nav-btn mission-btn" type="button">How to?</button>
        <button class="nav-btn mission-btn" type="button">Modern Workflows</button>
      </div>

      <div class="nav-right">
        <button class="nav-btn icon-btn" @click="onThemeToggle" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
          <svg v-if="!isDark" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4"/>
            <line x1="12" y1="2"  x2="12" y2="5"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/>
            <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
            <line x1="2"  y1="12" x2="5"  y2="12"/>
            <line x1="19" y1="12" x2="22" y2="12"/>
            <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/>
            <line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
          </svg>
        </button>
        <button class="nav-btn icon-btn add-btn" @click="onAddClick" aria-label="Add new">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5"  y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button class="nav-btn icon-btn" @click="onSignOut" aria-label="Sign out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="main-content">
      <h1 class="welcome-heading">Welcome, {{ firstName || 'there' }}</h1>

      <div class="cards-grid">
        <button class="card card--blue" @click="onCardClick('Connectors')">
          <div class="card-icon">
            <!-- Lightning bolt -->
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L4.09 12.97H11L10 22l8.91-10.97H13L13 2z"/>
            </svg>
          </div>
          <span class="card-label">Connectors</span>
        </button>

        <button class="card card--gold" @click="onCardClick('Research')">
          <div class="card-icon">
            <!-- Magnifying glass over chart -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="16" height="14" rx="2"/>
              <line x1="5" y1="13" x2="5"  y2="10"/>
              <line x1="8" y1="13" x2="8"  y2="7"/>
              <line x1="11" y1="13" x2="11" y2="9"/>
              <line x1="14" y1="13" x2="14" y2="6"/>
              <circle cx="17.5" cy="17.5" r="3"/>
              <line x1="20" y1="20" x2="22" y2="22"/>
            </svg>
          </div>
          <span class="card-label">Research</span>
        </button>

        <button class="card card--red" @click="onCardClick('Creation Venture')">
          <div class="card-icon">
            <!-- Globe -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <ellipse cx="12" cy="12" rx="4" ry="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M6 5.5C7.5 7 9.5 8 12 8s4.5-1 6-2.5"/>
              <path d="M6 18.5C7.5 17 9.5 16 12 16s4.5 1 6 2.5"/>
            </svg>
          </div>
          <span class="card-label">Creation Venture</span>
        </button>

        <button class="card card--green" @click="onCardClick('Thoughts')">
          <div class="card-icon">
            <!-- Brain with gear -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.14z"/>
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.14z"/>
              <circle cx="16" cy="11" r="1.5"/>
            </svg>
          </div>
          <span class="card-label">Thoughts</span>
        </button>
      </div>
    </main>

    <!-- Scripture Footer -->
    <footer class="scripture-footer">
      <p class="scripture-ref">Colossians 1:16</p>
      <p class="scripture-text">
        For in him all things were created: things in heaven and on earth, visible and invisible,
        whether thrones or powers or rulers or authorities; all things have been created through him and for him.
      </p>
    </footer>

    <!-- Sidebar -->
    <AppSidebar v-model:show="showSidebar" />
  </div>

  <MissionStatement :show="showMission" @close="showMission = false" />
</template>


