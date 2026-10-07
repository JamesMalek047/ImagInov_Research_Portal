<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = defineProps<{ show: boolean }>()
const emit  = defineEmits<{ 'update:show': [val: boolean] }>()

const router = useRouter()

function close()          { emit('update:show', false) }
function goTo(path: string) { close(); router.push(path) }
</script>

<template>
  <Transition name="sidebar-slide">
    <div v-if="show" class="sidebar-overlay" @click.self="close">
      <div class="sidebar-panel">
        <button class="nav-btn hamburger sidebar-close" @click="close" aria-label="Close menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <nav class="sidebar-nav">
          <button class="sidebar-item" @click="goTo('/')">
            <span class="sidebar-icon sidebar-icon--home">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
                <polyline points="9 21 9 12 15 12 15 21"/>
              </svg>
            </span>
            Home
          </button>
          <button class="sidebar-item" @click="goTo('/connectors')">
            <span class="sidebar-icon sidebar-icon--blue">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.09 12.97H11L10 22l8.91-10.97H13L13 2z"/></svg>
            </span>
            Connectors
          </button>
          <button class="sidebar-item" @click="goTo('/research')">
            <span class="sidebar-icon sidebar-icon--gold">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="16" height="14" rx="2"/>
                <line x1="5" y1="13" x2="5" y2="10"/><line x1="8" y1="13" x2="8" y2="7"/>
                <line x1="11" y1="13" x2="11" y2="9"/><line x1="14" y1="13" x2="14" y2="6"/>
                <circle cx="17.5" cy="17.5" r="3"/><line x1="20" y1="20" x2="22" y2="22"/>
              </svg>
            </span>
            Research
          </button>
          <button class="sidebar-item" @click="close">
            <span class="sidebar-icon sidebar-icon--red">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M6 5.5C7.5 7 9.5 8 12 8s4.5-1 6-2.5"/>
                <path d="M6 18.5C7.5 17 9.5 16 12 16s4.5 1 6 2.5"/>
              </svg>
            </span>
            Creation Venture
          </button>
          <button class="sidebar-item" @click="goTo('/thoughts')">
            <span class="sidebar-icon sidebar-icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.14z"/>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.14z"/>
                <circle cx="16" cy="11" r="1.5"/>
              </svg>
            </span>
            Thoughts
          </button>
        </nav>
      </div>
    </div>
  </Transition>
</template>
