<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface FeatureFlags {
  [key: string]: boolean
}

interface FlagsResponse {
  flags: FeatureFlags
  error?: string
}

interface Props {
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false
})

const FLAG_LABELS: Record<string, { label: string; description: string }> = {
  dark_mode: { label: 'Dark Mode', description: 'Enable dark color scheme' },
  show_favorites: { label: 'Show Favorites', description: 'Display the favorites section' },
  show_exports: { label: 'Show Exports', description: 'Display the exports section' },
  show_page_views: { label: 'Show Page Views', description: 'Display the page views counter' },
  experimental_features: { label: 'Experimental', description: 'Enable experimental features' },
}

const flags = ref<FeatureFlags>({})
const loading = ref(true)
const error = ref<string | null>(null)
const pendingToggle = ref<string | null>(null)

const basePath = computed(() => import.meta.env.VITE_BASE_PATH || '')

async function fetchFlags() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${basePath.value}/api/flags`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as FlagsResponse
    if (data.error) throw new Error(data.error)
    flags.value = data.flags
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch flags'
  } finally {
    loading.value = false
  }
}

async function toggleFlag(flag: string, value: boolean) {
  const previousValue = flags.value[flag]
  pendingToggle.value = flag

  // Optimistic update
  flags.value = { ...flags.value, [flag]: value }

  try {
    const res = await fetch(`${basePath.value}/api/flags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag, value }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (e) {
    // Revert on error
    flags.value = { ...flags.value, [flag]: previousValue }
    error.value = e instanceof Error ? e.message : 'Failed to toggle flag'
  } finally {
    pendingToggle.value = null
  }
}

const flagEntries = computed(() => Object.entries(flags.value))
const displayedFlags = computed(() => props.compact ? flagEntries.value.slice(0, 3) : flagEntries.value)
const hiddenCount = computed(() => Math.max(0, flagEntries.value.length - 3))

onMounted(() => {
  fetchFlags()
})
</script>

<template>
  <!-- Loading state -->
  <div
    v-if="loading"
    :class="[
      'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700',
      compact ? 'p-3' : 'p-6'
    ]"
  >
    <h3
      :class="[
        'font-bold text-gray-900 dark:text-white flex items-center gap-2',
        compact ? 'text-sm mb-2' : 'text-lg mb-4'
      ]"
    >
      <span>🚩</span> Feature Flags
    </h3>
    <div class="animate-pulse space-y-2">
      <div
        v-for="i in (compact ? 2 : 3)"
        :key="i"
        :class="['bg-gray-200 dark:bg-gray-700 rounded', compact ? 'h-6' : 'h-10']"
      />
    </div>
  </div>

  <!-- Error state -->
  <div
    v-else-if="error"
    :class="[
      'bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800',
      compact ? 'p-3' : 'p-6'
    ]"
  >
    <h3
      :class="[
        'font-bold text-gray-900 dark:text-white flex items-center gap-2',
        compact ? 'text-sm mb-1' : 'text-lg mb-2'
      ]"
    >
      <span>🚩</span> Feature Flags
    </h3>
    <p :class="['text-red-600 dark:text-red-400', compact ? 'text-xs' : 'text-sm']">
      {{ error }}
    </p>
  </div>

  <!-- Compact mode -->
  <div
    v-else-if="compact"
    class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
  >
    <h3 class="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
      <span>🚩</span> Feature Flags
      <span class="text-xs font-normal text-gray-400">(KV)</span>
    </h3>
    <div class="space-y-1.5">
      <div
        v-for="[key, value] in displayedFlags"
        :key="key"
        class="flex items-center justify-between"
      >
        <span class="text-xs text-gray-700 dark:text-gray-300">
          {{ FLAG_LABELS[key]?.label || key }}
        </span>
        <button
          @click="toggleFlag(key, !value)"
          :disabled="pendingToggle === key"
          :class="[
            'relative inline-flex h-4 w-8 items-center rounded-full transition-colors',
            value ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
          ]"
        >
          <span
            :class="[
              'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
              value ? 'translate-x-4' : 'translate-x-0.5'
            ]"
          />
        </button>
      </div>
      <p v-if="hiddenCount > 0" class="text-xs text-gray-400">
        +{{ hiddenCount }} more
      </p>
    </div>
  </div>

  <!-- Full mode -->
  <div
    v-else
    class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
  >
    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
      <span>🚩</span> Feature Flags
    </h3>
    <div class="space-y-3">
      <div
        v-for="[key, value] in displayedFlags"
        :key="key"
        class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
      >
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            {{ FLAG_LABELS[key]?.label || key }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ FLAG_LABELS[key]?.description || '' }}
          </p>
        </div>
        <button
          @click="toggleFlag(key, !value)"
          :disabled="pendingToggle === key"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            value ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              value ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>
    </div>
    <p class="text-xs text-gray-400 dark:text-gray-500 mt-4">
      Stored in Cloudflare KV (FLAGS namespace)
    </p>
  </div>
</template>
