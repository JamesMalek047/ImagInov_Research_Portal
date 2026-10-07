<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import AppSidebar from '../Components/AppSidebar.vue'

const router = useRouter()
const { accountId } = useAuth()
const isDark = ref(false)
const showSidebar = ref(false)

interface Note { id: number; text: string }

const quickNotes = ref<Note[]>([])

type PopupMode = 'quickNote' | null
const popupMode = ref<PopupMode>(null)
const draftText = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const QUICK_LIMIT = 200
const isQuickNote = computed(() => popupMode.value === 'quickNote')

async function openPopup(mode: 'quickNote') {
  draftText.value = ''
  popupMode.value = mode
  await nextTick()
  textareaRef.value?.focus()
}

const saveError = ref('')

function closePopup() { popupMode.value = null; saveError.value = '' }

async function saveNote() {
  const text = draftText.value.trim()
  if (!text) return
  saveError.value = ''
  if (accountId.value === null) {
    saveError.value = 'Account not loaded yet — try signing out and back in.'
    return
  }
  const { data, error } = await supabase
    .from('quick_notes')
    .insert({ account_id: accountId.value, text })
    .select('id, text')
    .single()
  if (error) { saveError.value = error.message; return }
  if (data) quickNotes.value.unshift({ id: data.id, text: data.text })
  closePopup()
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveNote() }
  if (e.key === 'Escape') closePopup()
}

const viewMode = ref<'quickNote' | null>(null)
const selectedNote = ref<Note | null>(null)
const viewedNotes = computed(() => quickNotes.value)

function openView(mode: 'quickNote') {
  selectedNote.value = null
  viewMode.value = mode
}
function closeView()            { viewMode.value = null; selectedNote.value = null }
function selectNote(note: Note) { selectedNote.value = note }
function backToList()           { selectedNote.value = null }

// ── Map of Thoughts ──
const mapRef = ref<HTMLDivElement | null>(null)
const nodePositions = ref<Record<number, { x: number; y: number }>>({})
const dragState = ref<{ id: number; startX: number; startY: number; origX: number; origY: number } | null>(null)

const allMapNodes = computed(() => [
  ...quickNotes.value.map(n => ({ ...n, type: 'quickNote' as const })),
])

watch(allMapNodes, (nodes) => {
  for (const node of nodes) {
    if (!(node.id in nodePositions.value)) {
      nodePositions.value[node.id] = {
        x: Math.random() * 72 + 5,
        y: Math.random() * 72 + 5,
      }
    }
  }
}, { immediate: true })

function startDrag(e: MouseEvent, id: number) {
  const pos = nodePositions.value[id]
  if (!pos) return
  dragState.value = { id, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
  e.preventDefault()
}

function onGlobalMouseMove(e: MouseEvent) {
  if (!dragState.value || !mapRef.value) return
  const rect = mapRef.value.getBoundingClientRect()
  const dx = ((e.clientX - dragState.value.startX) / rect.width) * 100
  const dy = ((e.clientY - dragState.value.startY) / rect.height) * 100
  nodePositions.value[dragState.value.id] = {
    x: Math.max(2, Math.min(92, dragState.value.origX + dx)),
    y: Math.max(2, Math.min(92, dragState.value.origY + dy)),
  }
}

function stopDrag() { dragState.value = null }

// Load notes when accountId is ready (it's set asynchronously after auth)
watch(accountId, async (id) => {
  if (id === null) return
  const { data } = await supabase
    .from('quick_notes')
    .select('id, text')
    .eq('account_id', id)
    .order('created_at', { ascending: false })
  if (data) quickNotes.value = data
}, { immediate: true })

onMounted(() => {
  window.addEventListener('mousemove', onGlobalMouseMove)
  window.addEventListener('mouseup', stopDrag)
})
onUnmounted(() => {
  window.removeEventListener('mousemove', onGlobalMouseMove)
  window.removeEventListener('mouseup', stopDrag)
})
</script>

<template>
  <div class="thoughts-page" :class="{ dark: isDark }">
    <!-- Navbar -->
    <nav class="thoughts-nav">
      <button class="nav-btn hamburger" @click="showSidebar = true" aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <span class="thoughts-title">Thoughts</span>

      <div class="nav-right">
        <button class="nav-btn icon-btn" @click="isDark = !isDark" :aria-label="isDark ? 'Light mode' : 'Dark mode'">
          <svg v-if="!isDark" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4"/>
            <line x1="12" y1="2"  x2="12" y2="5"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="4.22" y1="4.22"   x2="6.34"  y2="6.34"/>
            <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
            <line x1="2"  y1="12" x2="5"  y2="12"/>
            <line x1="19" y1="12" x2="22" y2="12"/>
            <line x1="4.22" y1="19.78"  x2="6.34"  y2="17.66"/>
            <line x1="17.66" y1="6.34"  x2="19.78" y2="4.22"/>
          </svg>
        </button>
        <button class="nav-btn icon-btn add-btn" aria-label="Add">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5"  y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="thoughts-content">
      <div class="thoughts-columns">

        <!-- Quick Notes -->
        <div class="thoughts-column">
          <h2 class="column-heading">Quick Notes</h2>
          <button class="add-pill" @click="openPopup('quickNote')">
            <span class="add-pill-icon">+</span> Add new quick note
          </button>
          <button class="add-pill view-pill" @click="openView('quickNote')">
            View quick notes
          </button>
          <div class="notes-list">
            <template v-if="quickNotes.length === 0">
              <div class="placeholder-card" v-for="n in 2" :key="n" />
            </template>
            <template v-else>
              <div v-for="note in quickNotes" :key="note.id" class="note-card">
                <p class="note-text">{{ note.text }}</p>
              </div>
            </template>
          </div>
        </div>

      </div>
    </main>

    <!-- Map of Thoughts -->
    <section class="map-section">
      <div class="map-header">
        <h3 class="map-title">Map of Thoughts</h3>
        <div class="map-header-actions">
          <button class="map-icon-btn" aria-label="Filter nodes">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <circle cx="7"  cy="6"  r="2" fill="currentColor" stroke="none"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <circle cx="17" cy="12" r="2" fill="currentColor" stroke="none"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
              <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none"/>
            </svg>
          </button>
          <button class="map-icon-btn map-more" aria-label="More options">···</button>
        </div>
      </div>
      <div class="map-canvas" ref="mapRef">
        <div v-if="allMapNodes.length === 0" class="map-empty">Add notes to see them here</div>
        <div
          v-for="node in allMapNodes"
          :key="node.id"
          class="map-node"
          :class="node.type"
          :style="{ left: (nodePositions[node.id]?.x ?? 50) + '%', top: (nodePositions[node.id]?.y ?? 50) + '%' }"
          @mousedown="startDrag($event, node.id)"
        >{{ node.text }}</div>
      </div>
    </section>

    <!-- Write Popup -->
    <Transition name="th-fade">
      <div v-if="popupMode" class="th-overlay" @click.self="closePopup">
        <div class="th-popup" :class="{ dark: isDark }">
          <header class="th-popup-header">
            <h3 class="th-popup-title">New Quick Note</h3>
            <button class="th-popup-close" @click="closePopup" aria-label="Close">✕</button>
          </header>
          <div class="th-popup-body">
            <textarea
              ref="textareaRef"
              class="th-textarea"
              placeholder="Write your quick note…"
              :maxlength="isQuickNote ? QUICK_LIMIT : undefined"
              v-model="draftText"
              @keydown="onKeydown"
            />
          </div>
          <footer class="th-popup-footer">
            <span
              v-if="isQuickNote"
              class="th-char-count"
              :class="{ 'th-char-count--warn': draftText.length >= QUICK_LIMIT - 20 }"
            >{{ draftText.length }} / {{ QUICK_LIMIT }}</span>
            <span v-else />
            <div class="th-popup-actions">
              <span v-if="saveError" class="th-save-error">{{ saveError }}</span>
              <button class="th-btn th-btn--cancel" @click="closePopup">Cancel</button>
              <button class="th-btn th-btn--save" :disabled="!draftText.trim()" @click="saveNote">
                Save <span class="th-hint">⌘↵</span>
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Transition>

    <!-- View Popup -->
    <Transition name="th-fade">
      <div v-if="viewMode" class="th-overlay" @click.self="closeView">
        <div class="th-popup" :class="{ dark: isDark }">
          <header class="th-popup-header">
            <div class="th-header-left">
              <button v-if="selectedNote" class="th-back-btn" @click="backToList">← Back</button>
              <h3 class="th-popup-title">Quick Notes</h3>
            </div>
            <button class="th-popup-close" @click="closeView" aria-label="Close">✕</button>
          </header>

          <!-- List of notes -->
          <div v-if="!selectedNote" class="th-note-list">
            <p v-if="viewedNotes.length === 0" class="th-empty">No notes yet.</p>
            <template v-else>
              <button
                v-for="note in viewedNotes"
                :key="note.id"
                class="th-note-list-item"
                @click="selectNote(note)"
              >{{ note.text }}</button>
            </template>
          </div>

          <!-- Full note detail -->
          <div v-else class="th-note-detail">
            <p class="th-detail-text">{{ selectedNote.text }}</p>
          </div>
        </div>
      </div>
    </Transition>
    <AppSidebar v-model:show="showSidebar" />
  </div>
</template>
