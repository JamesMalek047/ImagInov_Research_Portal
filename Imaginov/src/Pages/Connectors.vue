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

interface DeviceSwitch {
  id: number          // settings.id
  label: string       // settings.name
  active: boolean     // settings.value === 'true'
  setting_type: string | null
}
interface Device {
  id: number          // connector.id
  name: string        // connector.name
  online: boolean     // derived from connector.status
  switches: DeviceSwitch[]
}

const devices = ref<Device[]>([])
const activeDevice = ref<Device | null>(null)

function openConfig(device: Device) { activeDevice.value = device }
function closeConfig() { activeDevice.value = null }

async function toggleSwitch(sw: DeviceSwitch) {
  sw.active = !sw.active
  await supabase
    .from('settings')
    .update({ value: sw.active ? 'true' : 'false' })
    .eq('id', sw.id)
}

async function loadDevices(id: number) {
  const { data } = await supabase
    .from('connector')
    .select('id, name, status, settings(id, name, setting_type, value)')
    .eq('account_id', id)
  if (!data) return
  devices.value = data.map(row => ({
    id: row.id,
    name: row.name,
    online: row.status?.toLowerCase() !== 'offline',
    switches: (row.settings as { id: number; name: string; setting_type: string | null; value: string }[]).map(s => ({
      id: s.id,
      label: s.name,
      active: s.value === 'true',
      setting_type: s.setting_type,
    })),
  }))
}

// Load when accountId is ready (it's set asynchronously after auth)
watch(accountId, (id) => { if (id !== null) loadDevices(id) }, { immediate: true })

// ── Add Connector ──
const showAddForm = ref(false)
const newName = ref('')
const newOnline = ref(true)
const newSettings = ref<{ name: string; active: boolean }[]>([])
const addLoading = ref(false)

function addSetting() {
  newSettings.value.push({ name: '', active: false })
}

function removeSetting(i: number) {
  newSettings.value.splice(i, 1)
}

function resetAddForm() {
  newName.value = ''
  newOnline.value = true
  newSettings.value = []
  showAddForm.value = false
}

async function addConnector() {
  if (!newName.value.trim() || accountId.value === null) return
  addLoading.value = true

  const { data: connector } = await supabase
    .from('connector')
    .insert({ account_id: accountId.value, name: newName.value.trim(), status: newOnline.value ? 'online' : 'offline' })
    .select('id, name, status')
    .single()

  if (!connector) { addLoading.value = false; return }

  const validSettings = newSettings.value.filter(s => s.name.trim())
  let insertedSwitches: DeviceSwitch[] = []

  if (validSettings.length > 0) {
    const { data: settingsData } = await supabase
      .from('settings')
      .insert(validSettings.map(s => ({
        connector_id: connector.id,
        name: s.name.trim(),
        setting_type: 'toggle',
        value: s.active ? 'true' : 'false',
      })))
      .select('id, name, setting_type, value')
    if (settingsData) {
      insertedSwitches = settingsData.map(s => ({
        id: s.id, label: s.name, active: s.value === 'true', setting_type: s.setting_type,
      }))
    }
  }

  devices.value.push({ id: connector.id, name: connector.name, online: connector.status !== 'offline', switches: insertedSwitches })
  addLoading.value = false
  resetAddForm()
}
</script>

<template>
  <div class="connectors-page" :class="{ dark: isDark }">

    <!-- Navbar -->
    <nav class="connectors-nav">
      <button class="nav-btn hamburger" @click="showSidebar = true" aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <span class="connectors-title">Connectors</span>

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
        <button class="nav-btn icon-btn" @click="showAddForm = true" aria-label="Add connector">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5"  y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    </nav>

    <!-- Device Grid -->
    <main class="connectors-content">
      <p class="connectors-subtitle">Peripheral Devices</p>
      <p v-if="devices.length === 0" class="connectors-empty">No connectors yet — press + to add one.</p>
      <div class="devices-grid">
        <button
          v-for="device in devices"
          :key="device.id"
          class="device-card"
          :class="{ offline: !device.online }"
          @click="openConfig(device)"
        >
          <span class="device-status-dot" :class="device.online ? 'dot--online' : 'dot--offline'"></span>
          <div class="device-icon">
            <!-- USB Hub -->
            <svg v-if="device.name === 'USB Hub'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="10" width="18" height="7" rx="2"/>
              <line x1="7" y1="10" x2="7" y2="7"/><line x1="12" y1="10" x2="12" y2="4"/><line x1="17" y1="10" x2="17" y2="7"/>
              <circle cx="7" cy="6" r="1"/><circle cx="12" cy="3" r="1"/><circle cx="17" cy="6" r="1"/>
            </svg>
            <!-- Keyboard -->
            <svg v-else-if="device.name === 'Keyboard'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"/>
              <line x1="6" y1="10" x2="6" y2="10"/><line x1="10" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="14" y2="10"/><line x1="18" y1="10" x2="18" y2="10"/>
              <line x1="8" y1="14" x2="16" y2="14"/>
            </svg>
            <!-- Mouse -->
            <svg v-else-if="device.name === 'Mouse'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="7" y="3" width="10" height="16" rx="5"/>
              <line x1="12" y1="3" x2="12" y2="9"/>
            </svg>
            <!-- Webcam -->
            <svg v-else-if="device.name === 'Webcam'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="10" r="5"/>
              <circle cx="12" cy="10" r="2"/>
              <line x1="12" y1="15" x2="12" y2="18"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
            </svg>
            <!-- Microphone -->
            <svg v-else-if="device.name === 'Microphone'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="2" width="6" height="11" rx="3"/>
              <path d="M5 10a7 7 0 0 0 14 0"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
              <line x1="9" y1="21" x2="15" y2="21"/>
            </svg>
            <!-- Speaker -->
            <svg v-else-if="device.name === 'Speaker'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="4" width="10" height="16" rx="2"/>
              <circle cx="9" cy="15" r="2"/>
              <line x1="9" y1="7" x2="9" y2="8"/>
              <path d="M17 7a5 5 0 0 1 0 10"/>
              <path d="M19.5 4.5a9 9 0 0 1 0 15"/>
            </svg>
            <!-- Monitor -->
            <svg v-else-if="device.name === 'Monitor'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <!-- External Drive -->
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="5" width="16" height="14" rx="2"/>
              <line x1="4" y1="13" x2="20" y2="13"/>
              <circle cx="8" cy="17" r="1"/>
              <circle cx="12" cy="17" r="1"/>
            </svg>
          </div>
          <span class="device-name">{{ device.name }}</span>
        </button>
      </div>
    </main>

    <!-- Config Popup -->
    <Transition name="cfg-fade">
      <div v-if="activeDevice" class="cfg-overlay" @click.self="closeConfig">
        <div class="cfg-popup">
          <div class="cfg-header">
            <div class="cfg-header-left">
              <span class="cfg-status-dot" :class="activeDevice.online ? 'dot--online' : 'dot--offline'"></span>
              <h2 class="cfg-title">{{ activeDevice.name }}</h2>
            </div>
            <button class="cfg-close" @click="closeConfig" aria-label="Close">✕</button>
          </div>

          <p class="cfg-meta">
            <span :class="activeDevice.online ? 'status-online' : 'status-offline'">
              {{ activeDevice.online ? 'Online' : 'Offline' }}
            </span>
          </p>

          <div class="cfg-switches">
            <div v-for="sw in activeDevice.switches" :key="sw.label" class="switch-row">
              <span class="switch-label">{{ sw.label }}</span>
              <button
                class="toggle"
                :class="{ 'toggle--on': sw.active }"
                @click="toggleSwitch(sw)"
                :aria-label="`Toggle ${sw.label}`"
                role="switch"
                :aria-checked="sw.active"
              >
                <span class="toggle-thumb"></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Add Connector Popup -->
    <Transition name="cfg-fade">
      <div v-if="showAddForm" class="cfg-overlay" @click.self="resetAddForm">
        <div class="cfg-popup add-connector-popup">
          <div class="cfg-header">
            <h2 class="cfg-title">New Connector</h2>
            <button class="cfg-close" @click="resetAddForm" aria-label="Close">✕</button>
          </div>

          <div class="add-connector-body">
            <!-- Name -->
            <div class="add-field">
              <span class="switch-label">Name</span>
              <input
                v-model="newName"
                class="add-connector-input"
                placeholder="e.g. Raspberry Pi"
                @keydown.esc="resetAddForm"
              />
            </div>

            <!-- Status -->
            <div class="switch-row">
              <span class="switch-label">Online</span>
              <button class="toggle" :class="{ 'toggle--on': newOnline }" @click="newOnline = !newOnline" role="switch" :aria-checked="newOnline">
                <span class="toggle-thumb"></span>
              </button>
            </div>

            <!-- Configuration Settings -->
            <div class="add-settings-section">
              <div class="add-settings-header">
                <span class="switch-label">Configuration Settings</span>
                <button class="add-setting-btn" @click="addSetting">+ Add</button>
              </div>

              <div v-if="newSettings.length === 0" class="add-settings-empty">No settings yet — press Add to define switches.</div>

              <div v-for="(setting, i) in newSettings" :key="i" class="add-setting-row">
                <input
                  v-model="setting.name"
                  class="add-connector-input add-setting-input"
                  placeholder="Setting name…"
                />
                <button class="toggle" :class="{ 'toggle--on': setting.active }" @click="setting.active = !setting.active" role="switch" :aria-checked="setting.active">
                  <span class="toggle-thumb"></span>
                </button>
                <button class="remove-setting-btn" @click="removeSetting(i)" aria-label="Remove">✕</button>
              </div>
            </div>
          </div>

          <button class="add-connector-save" @click="addConnector" :disabled="!newName.trim() || addLoading">
            {{ addLoading ? 'Saving…' : 'Save Connector' }}
          </button>
        </div>
      </div>
    </Transition>
    <AppSidebar v-model:show="showSidebar" />
  </div>
</template>