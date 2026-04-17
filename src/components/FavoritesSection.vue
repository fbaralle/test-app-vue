<script setup lang="ts">
import { ref, onMounted } from 'vue'

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

const favorites = ref<Favorite[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const basePath = import.meta.env.VITE_API_MOUNT_PATH || ""

async function fetchFavorites() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${basePath}/api/favorites?user_id=public`)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const data = (await res.json()) as FavoritesResponse
    favorites.value = data.favorites || []
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch favorites'
  } finally {
    loading.value = false
  }
}

async function removeFavorite(coinId: string) {
  try {
    const res = await fetch(`${basePath}/api/favorites?user_id=public&coin_id=${coinId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    favorites.value = favorites.value.filter(f => f.coin_id !== coinId)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to remove favorite'
  }
}

onMounted(() => {
  fetchFavorites()
})

defineExpose({ fetchFavorites })
</script>

<template>
  <div class="w-full max-w-6xl mx-auto mb-8">
    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">
          Favorites
        </h2>
        <button
          @click="fetchFavorites"
          :disabled="loading"
          class="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

      <div v-if="error" class="text-red-500 dark:text-red-400 text-sm mb-4">
        {{ error }}
      </div>

      <div v-if="loading && favorites.length === 0" class="text-gray-500 dark:text-gray-400 text-sm">
        Loading favorites...
      </div>

      <div v-else-if="favorites.length === 0" class="text-gray-500 dark:text-gray-400 text-sm">
        No favorites yet. Click the star icon on a coin to add it to your favorites.
      </div>

      <div v-else class="flex flex-wrap gap-3">
        <div
          v-for="favorite in favorites"
          :key="favorite.id"
          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <img
            v-if="favorite.coin_image"
            :src="favorite.coin_image"
            :alt="favorite.coin_name || favorite.coin_id"
            class="w-6 h-6 rounded-full"
          />
          <div
            v-else
            class="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300"
          >
            {{ (favorite.coin_symbol || favorite.coin_id).charAt(0).toUpperCase() }}
          </div>
          <span class="font-medium text-gray-900 dark:text-white text-sm">
            {{ favorite.coin_name || favorite.coin_id }}
          </span>
          <span v-if="favorite.coin_symbol" class="text-gray-400 uppercase text-xs">
            {{ favorite.coin_symbol }}
          </span>
          <button
            @click="removeFavorite(favorite.coin_id)"
            class="ml-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Remove from favorites"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
