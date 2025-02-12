<script setup lang="ts">
const { data, refetch, isLoading } = useQuery('https://randomuser.me/api/', ['data2']);
</script>

<template>
  <div>
    <div>TEST 2 {{ isLoading }}</div>
    <NuxtLink to="/test">TEST</NuxtLink>
    <div @click="refetch">RESEND</div>
    <div>{{ data }}</div>
  </div>
</template>
