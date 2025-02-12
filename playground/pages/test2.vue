<script setup lang="ts">
const { data, refetch, isLoading } = useRawQuery({
  key: ['data2'],
  url: 'https://randomuser.me/api/',
});
</script>

<template>
  <div>
    <div>TEST 2 {{ isLoading }}</div>
    <div @click="refetch">RESEND</div>
    <div>{{ data }}</div>
  </div>
</template>

<style scoped></style>
