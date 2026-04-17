<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Export {
  key: string
  size: number
  uploaded: string
}

interface ExportsResponse {
  exports: Export[]
  error?: string
}

interface ExportResult {
  success: boolean
  id: string
  url: string
}

interface Favorite {
  id: number
  user_id: string
  coin_id: string
  coin_name: string | null
  coin_symbol: string | null
  coin_image: string | null
  created_at: number
}

interface FavoritesResponse {
  favorites: Favorite[]
}

interface Props {
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false
})

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const exports = ref<Export[]>([])
const favorites = ref<Favorite[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const exporting = ref(false)
const lastExportId = ref<string | null>(null)

const basePath = import.meta.env.PUBLIC_API_MOUNT_PATH || ""

async function fetchExports() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${basePath}/api/export`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as ExportsResponse
    if (data.error) throw new Error(data.error)
    exports.value = data.exports || []
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch exports'
  } finally {
    loading.value = false
  }
}

async function fetchFavorites() {
  try {
    const res = await fetch(`${basePath}/api/favorites?user_id=public`)
    if (res.ok) {
      const data = (await res.json()) as FavoritesResponse
      favorites.value = data.favorites || []
    }
  } catch {
    // Silently fail
  }
}

async function handleExportFavorites() {
  exporting.value = true
  lastExportId.value = null
  try {
    const res = await fetch(`${basePath}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'favorites',
        title: 'Favorites Export',
        exportedAt: new Date().toISOString(),
        favorites: favorites.value,
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const result = (await res.json()) as ExportResult
    lastExportId.value = result.id
    await fetchExports()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to export'
  } finally {
    exporting.value = false
  }
}

const displayedExports = computed(() => props.compact ? exports.value.slice(0, 2) : exports.value)
const hiddenCount = computed(() => Math.max(0, exports.value.length - 2))

onMounted(() => {
  fetchExports()
  fetchFavorites()
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
      <span>📦</span> R2 Exports
    </h3>
    <div class="animate-pulse space-y-2">
      <div
        v-for="i in (compact ? 2 : 2)"
        :key="i"
        :class="['bg-gray-200 dark:bg-gray-700 rounded', compact ? 'h-6' : 'h-12']"
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
      <span>📦</span> R2 Exports
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
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <span>📦</span> Exports
        <span class="text-xs font-normal text-gray-400">(R2)</span>
      </h3>
      <button
        @click="handleExportFavorites"
        :disabled="exporting || favorites.length === 0"
        class="px-2 py-1 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ exporting ? '...' : 'Export' }}
      </button>
    </div>
    <div class="space-y-1">
      <p v-if="exports.length === 0" class="text-xs text-gray-500">No exports yet</p>
      <div
        v-else
        v-for="exp in displayedExports"
        :key="exp.key"
        class="flex items-center justify-between text-xs"
      >
        <span class="text-gray-700 dark:text-gray-300 truncate flex-1">
          {{ exp.key.replace('exports/', '').slice(0, 15) }}...
        </span>
        <span class="text-gray-400 ml-2">{{ formatBytes(exp.size) }}</span>
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
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <span>📦</span> R2 Exports
      </h3>
      <button
        @click="handleExportFavorites"
        :disabled="exporting || favorites.length === 0"
        class="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {{ exporting ? 'Exporting...' : 'Export Favorites' }}
      </button>
    </div>

    <div
      v-if="lastExportId"
      class="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg"
    >
      <p class="text-sm text-green-700 dark:text-green-400">
        Export created: <code class="font-mono">{{ lastExportId }}</code>
      </p>
    </div>

    <p v-if="exports.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
      No exports yet. Click "Export Favorites" to create one.
    </p>

    <div v-else class="space-y-2">
      <div
        v-for="exp in exports"
        :key="exp.key"
        class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
            {{ exp.key.replace('exports/', '') }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ new Date(exp.uploaded).toLocaleString() }} &bull; {{ formatBytes(exp.size) }}
          </p>
        </div>
        <a
          :href="`${basePath}/api/export?id=${exp.key.replace('exports/', '')}`"
          target="_blank"
          rel="noopener noreferrer"
          class="ml-3 px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          View
        </a>
      </div>
    </div>

    <p class="text-xs text-gray-400 dark:text-gray-500 mt-4">
      Stored in Cloudflare R2 (MEDIA bucket)
    </p>
  </div>
</template>
