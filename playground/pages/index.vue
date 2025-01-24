<script setup lang="ts">
const { data, refetch, isLoading } = useQuery({
  key: ['data2'],
  url: 'https://randomuser.me/api/',
});
</script>

<template>
  <div>
    <div>TEST 2 {{ isLoading }}</div>
    <NuxtLink to="/test">TEST</NuxtLink>
    <div @click="refetch">RESEND</div>
    <div>{{ data }}</div>
  </div>
</template>

<style scoped></style>
