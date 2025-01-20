<script setup lang="ts">
const api = useApi('https://example.com/api');
const result = await api.get<{ user: string }>('myUrl');
</script>

<template>
  <div>Nuxt module playground! {{ result }}</div>
</template>
