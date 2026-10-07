<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

defineProps<{ show: boolean }>()
defineEmits<{ (e: 'close'): void }>()

const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 60_000) })
onUnmounted(() => clearInterval(timer))

type Waypoint = { h: number; r: number; g: number; b: number }

// Sky color waypoints by hour (0–24)
const waypoints: Waypoint[] = [
  { h: 0,  r: 0,   g: 0,   b: 0   },
  { h: 5,  r: 0,   g: 0,   b: 0   },
  { h: 7,  r: 255, g: 255, b: 255 },
  { h: 20, r: 255, g: 255, b: 255 },
  { h: 22, r: 0,   g: 0,   b: 0   },
  { h: 24, r: 0,   g: 0,   b: 0   },
]

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function skyColor(date: Date): string {
  const frac = (date.getHours() * 60 + date.getMinutes()) / 60
  const idx = waypoints.findIndex((wp, i) => i < waypoints.length - 1 && frac >= wp.h && frac < (waypoints[i + 1]?.h ?? 24))
  const lo: Waypoint = (idx >= 0 ? waypoints[idx] : waypoints[0]) ?? { h: 0, r: 13, g: 27, b: 42 }
  const hi: Waypoint = (idx >= 0 ? waypoints[idx + 1] : waypoints[1]) ?? { h: 5, r: 26, g: 42, b: 74 }
  const t = (frac - lo.h) / (hi.h - lo.h || 1)
  return `rgb(${Math.round(lerp(lo.r, hi.r, t))},${Math.round(lerp(lo.g, hi.g, t))},${Math.round(lerp(lo.b, hi.b, t))})`
}

const bgColor = computed(() => skyColor(now.value))

const isDark = computed(() => {
  const m = bgColor.value.match(/rgb\((\d+),(\d+),(\d+)\)/) ?? []
  const lum = (0.299 * Number(m[1] ?? 0) + 0.587 * Number(m[2] ?? 0) + 0.114 * Number(m[3] ?? 0)) / 255
  return lum <= 0.5
})
</script>

<template>
  <Transition name="ms-fade">
    <div v-if="show" class="ms-overlay" @click.self="$emit('close')">
      <div class="ms-window" :style="{ backgroundColor: bgColor }">
        <header class="ms-header" :class="{ 'ms-header--dark': isDark }">
          <h2 class="ms-title">Mission Statement</h2>
          <button class="ms-close" @click="$emit('close')" aria-label="Close">✕</button>
        </header>
        <div class="ms-body" :class="{ 'ms-body--dark': isDark }">
          <p v-for="i in 7" :key="i">
            Description description description description description description
            description description description description description description
            description description description description description description.
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>
