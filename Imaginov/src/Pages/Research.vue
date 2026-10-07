<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import AppSidebar from '../Components/AppSidebar.vue'

const router = useRouter()
const { accountId } = useAuth()
const isDark = ref(false)
const showSidebar = ref(false)

interface ResearchDocument { id: number; name: string; text: string; created_date: string }
interface ResearchStat     { id: number; stat_name: string; stat_figure: string; stat_unit: string | null }
interface ResearchLit      { id: number; title: string; author: string | null; source: string | null; notes: string | null }
interface ThoughtNote      { id: number; text: string }
interface ResearchUpdate   { id: number; documents_id: number; time: string; update_text: string }

// ── Document List ──
const documents  = ref<ResearchDocument[]>([])
const activeDoc  = ref<ResearchDocument | null>(null)
const stats      = ref<ResearchStat[]>([])
const literature = ref<ResearchLit[]>([])
const updates    = ref<ResearchUpdate[]>([])
const createLoading = ref(false)
type ResearchFeature = 'statistics' | 'literature' | 'metadata' | 'peripherals' | null
const activeFeature = ref<ResearchFeature>(null)
const researchNote = ref('')
const researchNoteLoading = ref(false)
const researchNoteError = ref('')
const taggedNotes = ref<ThoughtNote[]>([])
const showTaggedNotes = ref(false)
const taggedNotesLoading = ref(false)
const updateText = ref('')
const updateLoading = ref(false)
const updateError = ref('')

watch(accountId, async (id) => {
  if (!id) return
  const { data } = await supabase
    .from('documents')
    .select('id, name, text, created_date')
    .eq('account_id', id)
    .order('created_date', { ascending: false })
  if (data) documents.value = data
}, { immediate: true })

async function createDocument() {
  if (!accountId.value) return
  createLoading.value = true
  const { data } = await supabase
    .from('documents')
    .insert({ account_id: accountId.value, name: 'Untitled Document', text: '' })
    .select('id, name, text, created_date')
    .single()
  createLoading.value = false
  if (!data) return
  documents.value.unshift(data)
  openDocument(data)
}

// ── Document Detail ──
async function openDocument(doc: ResearchDocument) {
  activeDoc.value = { ...doc }
  const [statsRes, litRes, updatesRes] = await Promise.all([
    supabase.from('statistics').select('id, stat_name, stat_figure, stat_unit').eq('document_id', doc.id).order('id'),
    supabase.from('literature').select('id, title, author, source, notes').eq('document_id', doc.id).order('id'),
    supabase.from('updates').select('id, documents_id, time, update_text').eq('documents_id', doc.id).order('time', { ascending: false }),
  ])
  stats.value     = statsRes.data ?? []
  literature.value = litRes.data  ?? []
  updates.value   = updatesRes.data ?? []
}

const saveLoading = ref(false)
const savedFlash  = ref(false)

async function saveDoc() {
  saveLoading.value = true
  await saveTitle()
  await saveContent()
  saveLoading.value = false
  savedFlash.value = true
  setTimeout(() => { savedFlash.value = false }, 1500)
}

async function closeDocument() {
  await saveTitle()
  await saveContent()
  activeDoc.value  = null
  activeFeature.value = null
  taggedNotes.value = []
  showTaggedNotes.value = false
  stats.value      = []
  literature.value = []
  updates.value    = []
  expandedLitId.value = null
}

async function saveTitle() {
  if (!activeDoc.value) return
  const name = activeDoc.value.name.trim() || 'Untitled Document'
  activeDoc.value.name = name
  await supabase.from('documents').update({ name, last_modified_date: new Date().toISOString() }).eq('id', activeDoc.value.id)
  const doc = documents.value.find(d => d.id === activeDoc.value!.id)
  if (doc) doc.name = name
}

async function saveContent() {
  if (!activeDoc.value) return
  const text = activeDoc.value.text
  await supabase.from('documents')
    .update({ text, last_modified_date: new Date().toISOString() })
    .eq('id', activeDoc.value.id)
  const doc = documents.value.find(d => d.id === activeDoc.value!.id)
  if (doc) doc.text = text
}

async function addUpdate() {
  const text = updateText.value.trim()
  if (!text || !activeDoc.value) return
  updateLoading.value = true
  updateError.value = ''
  const { data, error } = await supabase
    .from('updates')
    .insert({ documents_id: activeDoc.value.id, time: new Date().toISOString(), update_text: text })
    .select('id, documents_id, time, update_text')
    .single()
  updateLoading.value = false
  if (error) {
    updateError.value = error.message
    return
  }
  if (data) updates.value.unshift(data)
  updateText.value = ''
}

async function deleteUpdate(updateId: number) {
  const { error } = await supabase.from('updates').delete().eq('id', updateId)
  if (error) {
    updateError.value = error.message
    return
  }
  updates.value = updates.value.filter(update => update.id !== updateId)
}

async function addResearchNote() {
  const text = researchNote.value.trim()
  if (!text || !accountId.value || !activeDoc.value) return
  researchNoteLoading.value = true
  researchNoteError.value = ''
  const documentName = activeDoc.value.name.trim() || 'Untitled Document'
  const { data, error } = await supabase
    .from('quick_notes')
    .insert({ account_id: accountId.value, text: `[Research: ${documentName}] ${text}` })
    .select('id, text')
    .single()
  researchNoteLoading.value = false
  if (error) {
    researchNoteError.value = error.message
    return
  }
  researchNote.value = ''
  if (showTaggedNotes.value && data) taggedNotes.value.unshift(data)
}

async function toggleTaggedNotes() {
  if (showTaggedNotes.value) {
    showTaggedNotes.value = false
    return
  }
  if (!accountId.value || !activeDoc.value) return
  taggedNotesLoading.value = true
  researchNoteError.value = ''
  const documentName = activeDoc.value.name.trim() || 'Untitled Document'
  const { data, error } = await supabase
    .from('quick_notes')
    .select('id, text')
    .eq('account_id', accountId.value)
    .like('text', `[Research: ${documentName}]%`)
    .order('created_at', { ascending: false })
  taggedNotesLoading.value = false
  if (error) {
    researchNoteError.value = error.message
    return
  }
  taggedNotes.value = data ?? []
  showTaggedNotes.value = true
}

async function deleteDocument() {
  if (!activeDoc.value) return
  await supabase.from('documents').delete().eq('id', activeDoc.value.id)
  documents.value = documents.value.filter(d => d.id !== activeDoc.value!.id)
  // skip save — document is already deleted
  activeDoc.value  = null
  stats.value      = []
  literature.value = []
  updates.value    = []
  expandedLitId.value = null
  showDeleteConfirm.value = false
}

const showDeleteConfirm = ref(false)

// ── Stats ──
type StatMode = 'add' | 'edit' | null
const statMode     = ref<StatMode>(null)
const editingStat  = ref<ResearchStat | null>(null)
const statLabel    = ref('')
const statValue    = ref('')
const statUnit     = ref('')
const statLoading  = ref(false)

function openAddStat() {
  statLabel.value = ''; statValue.value = ''; statUnit.value = ''
  editingStat.value = null
  statMode.value = 'add'
}

function openEditStat(stat: ResearchStat) {
  statLabel.value = stat.stat_name
  statValue.value = stat.stat_figure
  statUnit.value  = stat.stat_unit ?? ''
  editingStat.value = stat
  statMode.value = 'edit'
}

function closeStat() { statMode.value = null }

async function saveStat() {
  if (!statLabel.value.trim() || !statValue.value.trim() || !activeDoc.value) return
  statLoading.value = true

  if (statMode.value === 'add') {
    const { data } = await supabase
      .from('statistics')
      .insert({
        document_id: activeDoc.value.id,
        stat_name: statLabel.value.trim(),
        stat_figure: statValue.value.trim(),
        stat_unit: statUnit.value.trim() || null,
      })
      .select('id, stat_name, stat_figure, stat_unit')
      .single()
    if (data) stats.value.push(data)
  } else if (editingStat.value) {
    const updates = { stat_name: statLabel.value.trim(), stat_figure: statValue.value.trim(), stat_unit: statUnit.value.trim() || null }
    await supabase.from('statistics').update(updates).eq('id', editingStat.value.id)
    const s = stats.value.find(x => x.id === editingStat.value!.id)
    if (s) { s.stat_name = updates.stat_name; s.stat_figure = updates.stat_figure; s.stat_unit = updates.stat_unit }
  }

  statLoading.value = false
  closeStat()
}

async function deleteStat() {
  if (!editingStat.value) return
  await supabase.from('statistics').delete().eq('id', editingStat.value.id)
  stats.value = stats.value.filter(s => s.id !== editingStat.value!.id)
  closeStat()
}

// ── Literature ──
const expandedLitId = ref<number | null>(null)
type LitMode = 'add' | 'edit' | null
const litMode     = ref<LitMode>(null)
const editingLit  = ref<ResearchLit | null>(null)
const litTitle    = ref('')
const litAuthor   = ref('')
const litSource   = ref('')
const litNotes    = ref('')
const litLoading  = ref(false)

function toggleLit(id: number) {
  expandedLitId.value = expandedLitId.value === id ? null : id
}

function openFeature(feature: Exclude<ResearchFeature, null>) {
  activeFeature.value = feature
}

function closeFeature() {
  activeFeature.value = null
}

function openAddLit() {
  litTitle.value = ''; litAuthor.value = ''; litSource.value = ''; litNotes.value = ''
  editingLit.value = null
  litMode.value = 'add'
}

function openEditLit(lit: ResearchLit) {
  litTitle.value  = lit.title
  litAuthor.value = lit.author ?? ''
  litSource.value = lit.source ?? ''
  litNotes.value  = lit.notes  ?? ''
  editingLit.value = lit
  litMode.value = 'edit'
}

function closeLit() { litMode.value = null }

async function saveLit() {
  if (!litTitle.value.trim() || !activeDoc.value) return
  litLoading.value = true
  if (litMode.value === 'add') {
    const { data } = await supabase
      .from('literature')
      .insert({
        document_id: activeDoc.value.id,
        title:  litTitle.value.trim(),
        author: litAuthor.value.trim() || null,
        source: litSource.value.trim() || null,
        notes:  litNotes.value.trim()  || null,
      })
      .select('id, title, author, source, notes')
      .single()
    if (data) literature.value.push(data)
  } else if (editingLit.value) {
    const updates = {
      title:  litTitle.value.trim(),
      author: litAuthor.value.trim() || null,
      source: litSource.value.trim() || null,
      notes:  litNotes.value.trim()  || null,
    }
    await supabase.from('literature').update(updates).eq('id', editingLit.value.id)
    const l = literature.value.find(x => x.id === editingLit.value!.id)
    if (l) Object.assign(l, updates)
  }
  litLoading.value = false
  closeLit()
}

async function deleteLit() {
  if (!editingLit.value) return
  await supabase.from('literature').delete().eq('id', editingLit.value.id)
  literature.value = literature.value.filter(l => l.id !== editingLit.value!.id)
  closeLit()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="research-page" :class="{ dark: isDark }">

    <!-- Navbar -->
    <nav class="research-nav">
      <button class="nav-btn hamburger" @click="activeDoc ? closeDocument() : showSidebar = true" aria-label="Back">
        <svg v-if="activeDoc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <span class="research-nav-title">{{ activeDoc ? activeDoc.name : 'Research' }}</span>

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
        <button v-if="!activeDoc" class="nav-btn icon-btn" @click="createDocument" :disabled="createLoading" aria-label="New document">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5"  y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button v-if="activeDoc" class="nav-btn icon-btn research-save-btn" @click="saveDoc" :disabled="saveLoading" aria-label="Save document">
          <span v-if="savedFlash" style="font-size:11px;font-weight:600;letter-spacing:.5px">Saved</span>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
        </button>
        <button v-if="activeDoc" class="nav-btn icon-btn research-trash-btn" @click="showDeleteConfirm = true" aria-label="Delete document">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </nav>

    <nav v-if="activeDoc" class="research-subnav" aria-label="Research features">
      <button
        class="research-subnav-btn"
        :class="{ active: activeFeature === 'statistics' }"
        @click="openFeature('statistics')"
      >Statistics</button>
      <button
        class="research-subnav-btn"
        :class="{ active: activeFeature === 'literature' }"
        @click="openFeature('literature')"
      >Literature</button>
      <button
        class="research-subnav-btn"
        :class="{ active: activeFeature === 'metadata' }"
        @click="openFeature('metadata')"
      >Metadata</button>
      <button
        class="research-subnav-btn"
        :class="{ active: activeFeature === 'peripherals' }"
        @click="openFeature('peripherals')"
      >Peripherals</button>
    </nav>

    <!-- ── Document List ── -->
    <main v-if="!activeDoc" class="research-content">
      <p class="connectors-subtitle">Documents</p>

      <p v-if="documents.length === 0" class="research-empty">
        No documents yet — press + to create one.
      </p>

      <div class="research-doc-grid">
        <button
          v-for="doc in documents"
          :key="doc.id"
          class="research-doc-card"
          @click="openDocument(doc)"
        >
          <span class="research-doc-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <line x1="10" y1="9"  x2="8" y2="9"/>
            </svg>
          </span>
          <span class="research-doc-title">{{ doc.name }}</span>
          <span class="research-doc-date">{{ formatDate(doc.created_date) }}</span>
        </button>
      </div>
    </main>

    <!-- ── Document Detail ── -->
    <main v-else class="research-detail">

      <!-- Editable title -->
      <input
        v-model="activeDoc.name"
        class="research-title-input"
        placeholder="Untitled Document"
        @blur="saveTitle"
      />

      <!-- Text content -->
      <textarea
        v-model="activeDoc.text"
        class="research-content-area"
        placeholder="Write your research notes here…"
        @blur="saveContent"
      />

      <div class="research-detail-columns">
        <section class="research-detail-section">
          <div class="research-section-header">
            <h2 class="research-section-title">Updates</h2>
          </div>
          <textarea
            v-model="updateText"
            class="research-note-input"
            placeholder="Add an update…"
            rows="3"
          />
          <p v-if="updateError" class="research-note-error">{{ updateError }}</p>
          <button
            class="add-setting-btn research-note-save"
            :disabled="!updateText.trim() || updateLoading"
            @click="addUpdate"
          >{{ updateLoading ? 'Adding…' : 'Add update' }}</button>
          <div class="research-updates-list">
            <p v-if="updates.length === 0" class="research-section-empty">No updates yet.</p>
            <article v-for="update in updates" :key="update.id" class="research-update">
              <div class="research-update-header">
                <time class="research-update-time">{{ formatDate(update.time) }}</time>
                <button class="research-update-delete" @click="deleteUpdate(update.id)" aria-label="Delete update">Delete</button>
              </div>
              <p class="research-update-text">{{ update.update_text }}</p>
            </article>
          </div>
        </section>

        <section class="research-detail-section">
          <div class="research-section-header">
            <h2 class="research-section-title">Notes</h2>
          </div>
          <textarea
            v-model="researchNote"
            class="research-note-input"
            placeholder="Add a note to Thoughts…"
            rows="3"
          />
          <p v-if="researchNoteError" class="research-note-error">{{ researchNoteError }}</p>
          <button
            class="add-setting-btn research-note-save"
            :disabled="!researchNote.trim() || researchNoteLoading"
            @click="addResearchNote"
          >{{ researchNoteLoading ? 'Adding…' : 'Add to Thoughts' }}</button>
          <button class="research-tagged-notes-toggle" @click="toggleTaggedNotes">
            {{ taggedNotesLoading ? 'Loading…' : showTaggedNotes ? 'Hide tagged notes' : 'View tagged notes' }}
          </button>
          <div v-if="showTaggedNotes" class="research-tagged-notes">
            <p v-if="taggedNotes.length === 0" class="research-section-empty">No tagged notes yet.</p>
            <p v-for="note in taggedNotes" :key="note.id" class="research-tagged-note">{{ note.text }}</p>
          </div>
        </section>
      </div>

    </main>

    <!-- ── Research Feature Popup ── -->
    <Transition name="cfg-fade">
      <div v-if="activeFeature" class="cfg-overlay research-feature-overlay" @click.self="closeFeature">
        <div class="cfg-popup research-feature-popup">
          <div class="cfg-header">
            <h2 class="cfg-title">
              {{ activeFeature === 'statistics' ? 'Statistics' : activeFeature === 'literature' ? 'Literature' : activeFeature === 'metadata' ? 'Metadata' : 'Peripherals' }}
            </h2>
            <button class="cfg-close" @click="closeFeature" aria-label="Close">✕</button>
          </div>

          <div v-if="activeFeature === 'statistics'" class="research-feature-body">
            <div class="research-stats-header">
              <span class="research-feature-count">{{ stats.length }} {{ stats.length === 1 ? 'statistic' : 'statistics' }}</span>
              <button class="add-setting-btn" @click="openAddStat">+ Add Stat</button>
            </div>
            <p v-if="stats.length === 0" class="research-empty" style="padding:24px 0">No stats yet.</p>
            <div v-else class="research-stats-grid">
              <button v-for="stat in stats" :key="stat.id" class="research-stat-card" @click="openEditStat(stat)">
                <span class="stat-label">{{ stat.stat_name }}</span>
                <span class="stat-value">{{ stat.stat_figure }}</span>
                <span v-if="stat.stat_unit" class="stat-unit">{{ stat.stat_unit }}</span>
              </button>
            </div>
          </div>

          <div v-else-if="activeFeature === 'literature'" class="research-feature-body">
            <div class="research-stats-header">
              <span class="research-feature-count">{{ literature.length }} {{ literature.length === 1 ? 'source' : 'sources' }}</span>
              <button class="add-setting-btn" @click="openAddLit">+ Add</button>
            </div>
            <p v-if="literature.length === 0" class="research-empty" style="padding:24px 0">No literature yet.</p>
            <div v-else class="research-lit-list">
              <div v-for="lit in literature" :key="lit.id" class="research-lit-item">
                <div class="research-lit-row" @click="toggleLit(lit.id)">
                  <span class="research-lit-name">{{ lit.title }}</span>
                  <div class="research-lit-actions">
                    <button class="research-lit-edit" @click.stop="openEditLit(lit)" aria-label="Edit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <svg class="research-lit-chevron" :class="{ open: expandedLitId === lit.id }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>
                <Transition name="lit-expand">
                  <div v-if="expandedLitId === lit.id" class="research-lit-citation">
                    <span v-if="lit.author" class="research-lit-meta">{{ lit.author }}</span>
                    <span v-if="lit.source" class="research-lit-meta research-lit-source">{{ lit.source }}</span>
                    <p v-if="lit.notes">{{ lit.notes }}</p>
                  </div>
                </Transition>
              </div>
            </div>
          </div>

          <div v-else class="research-feature-body research-feature-empty-state">
            <p class="research-empty">No {{ activeFeature }} yet.</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Stat Add/Edit Popup ── -->
    <Transition name="cfg-fade">
      <div v-if="statMode" class="cfg-overlay" @click.self="closeStat">
        <div class="cfg-popup">
          <div class="cfg-header">
            <h2 class="cfg-title">{{ statMode === 'add' ? 'New Stat' : 'Edit Stat' }}</h2>
            <button class="cfg-close" @click="closeStat" aria-label="Close">✕</button>
          </div>

          <div class="add-connector-body" style="margin-top:16px">
            <div class="add-field">
              <span class="switch-label">Label</span>
              <input v-model="statLabel" class="add-connector-input" placeholder="e.g. Sample Size" />
            </div>
            <div class="add-field">
              <span class="switch-label">Value</span>
              <input v-model="statValue" class="add-connector-input" placeholder="e.g. 142" />
            </div>
            <div class="add-field">
              <span class="switch-label">Unit <span class="stat-unit-hint">(optional)</span></span>
              <input v-model="statUnit" class="add-connector-input" placeholder="e.g. ms, %, kg" />
            </div>
          </div>

          <div class="stat-popup-actions">
            <button v-if="statMode === 'edit'" class="stat-delete-btn" @click="deleteStat">Delete</button>
            <button
              class="add-connector-save stat-save-btn"
              @click="saveStat"
              :disabled="!statLabel.trim() || !statValue.trim() || statLoading"
            >{{ statLoading ? 'Saving…' : 'Save' }}</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Literature Add/Edit Popup ── -->
    <Transition name="cfg-fade">
      <div v-if="litMode" class="cfg-overlay" @click.self="closeLit">
        <div class="cfg-popup">
          <div class="cfg-header">
            <h2 class="cfg-title">{{ litMode === 'add' ? 'New Source' : 'Edit Source' }}</h2>
            <button class="cfg-close" @click="closeLit" aria-label="Close">✕</button>
          </div>
          <div class="add-connector-body" style="margin-top:16px">
            <div class="add-field">
              <span class="switch-label">Title</span>
              <input v-model="litTitle" class="add-connector-input" placeholder="e.g. The Nature of Things" />
            </div>
            <div class="add-field">
              <span class="switch-label">Author <span class="stat-unit-hint">(optional)</span></span>
              <input v-model="litAuthor" class="add-connector-input" placeholder="e.g. Smith, J. (2021)" />
            </div>
            <div class="add-field">
              <span class="switch-label">Source <span class="stat-unit-hint">(optional)</span></span>
              <input v-model="litSource" class="add-connector-input" placeholder="e.g. Journal of Science, Vol. 4" />
            </div>
            <div class="add-field">
              <span class="switch-label">Notes <span class="stat-unit-hint">(optional)</span></span>
              <textarea v-model="litNotes" class="add-connector-input research-lit-textarea" placeholder="Key points or quotes…" rows="3" />
            </div>
          </div>
          <div class="stat-popup-actions">
            <button v-if="litMode === 'edit'" class="stat-delete-btn" @click="deleteLit">Delete</button>
            <button class="add-connector-save stat-save-btn" @click="saveLit" :disabled="!litTitle.trim() || litLoading">
              {{ litLoading ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Delete Document Confirmation ── -->
    <Transition name="cfg-fade">
      <div v-if="showDeleteConfirm" class="cfg-overlay" @click.self="showDeleteConfirm = false">
        <div class="cfg-popup research-confirm-popup">
          <h2 class="cfg-title">Delete Document?</h2>
          <p class="research-confirm-text">This will permanently delete the document and all its stats.</p>
          <div class="stat-popup-actions">
            <button class="stat-delete-btn" @click="deleteDocument">Delete</button>
            <button class="add-connector-save stat-save-btn" @click="showDeleteConfirm = false">Cancel</button>
          </div>
        </div>
      </div>
    </Transition>

    <AppSidebar v-model:show="showSidebar" />
  </div>
</template>
