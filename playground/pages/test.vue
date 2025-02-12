<script setup lang="ts">
import type { Todo } from '../dto/todo';
// import CTest from '~/components/cTest.vue';

const { data, isLoading } = useQuery<Todo[]>('https://66aa4426613eced4eba83c35.mockapi.io/overview/todo', ['todo']);

const edit = ref();
</script>

<template>
  <div>
    <div>
      TODO
      <span v-if="isLoading">Loading...</span>
    </div>
    <NuxtLink to="/test2">Page 2</NuxtLink>

    <div v-for="todo of data" :key="todo.id" @click="edit = todo.id">{{ todo.id }}. {{ todo.title }}</div>
    <c-test v-if="edit" :id="edit" @close="edit = null" />
    <c-test v-if="edit" :id="edit" @close="edit = null" />
  </div>
</template>

<style scoped></style>
